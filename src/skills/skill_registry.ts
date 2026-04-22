import fs from "node:fs";
import path from "node:path";
import { getUserDataPath } from "../paths/paths";
import { SkillParser } from "./skill_parser";
import { SkillValidator } from "./skill_validator";
import type { Skill, SkillScope, SkillFilter, MatchedSkill } from "./types";
import log from "electron-log";

const logger = log.scope("skill-registry");

interface WatcherInfo {
  watcher: fs.FSWatcher;
  directory: string;
  scope: SkillScope;
}

/**
 * Central registry for all discovered skills.
 * Handles discovery, registration, and lookup of skills from both user-level and workspace-level directories.
 *
 * Singleton pattern ensures a single source of truth for all registered skills.
 */
export class SkillRegistry {
  private static instance: SkillRegistry | null = null;
  private skills: Map<string, Skill> = new Map();
  private parser = new SkillParser();
  private validator = new SkillValidator();
  private watchers: Map<string, WatcherInfo> = new Map();
  private watchEnabled = false;

  /**
   * Private constructor to enforce singleton pattern.
   * Use SkillRegistry.getInstance() to access the registry.
   */
  private constructor() {}

  /**
   * Get the singleton instance of the skill registry.
   */
  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  /**
   * Get the user-level skills directory path.
   * User-level skills are stored in ~/.neurocode/skills/
   */
  private getUserSkillsDirectory(): string {
    return path.join(getUserDataPath(), "skills");
  }

  /**
   * Get the workspace-level skills directory path.
   * Workspace-level skills are stored in .neurocode/skills/ relative to the workspace root.
   *
   * @param workspaceRoot - The root directory of the current workspace
   */
  private getWorkspaceSkillsDirectory(workspaceRoot: string): string {
    return path.join(workspaceRoot, ".neurocode", "skills");
  }

  /**
   * Scan standard locations and register all discovered skills.
   *
   * Discovery process:
   * 1. Scan user-level directory (~/.neurocode/skills/)
   * 2. Scan workspace-level directory (.neurocode/skills/)
   * 3. Workspace-level skills override user-level skills with the same name
   *
   * This method handles errors gracefully and continues discovery even if individual
   * skills fail to register. All errors are logged but do not prevent the discovery
   * process from completing.
   *
   * @param workspaceRoot - Optional workspace root directory. If not provided, only user-level skills are discovered.
   * @param enableWatch - Optional flag to enable file system watching for automatic re-registration on changes
   */
  async discoverAndRegister(
    workspaceRoot?: string,
    enableWatch = false,
  ): Promise<void> {
    logger.info("Starting skill discovery...");

    const discoveryErrors: Array<{ scope: SkillScope; error: Error }> = [];

    try {
      // Stop existing watchers if re-discovering
      if (enableWatch) {
        this.stopWatching();
        this.watchEnabled = true;
      }

      // Discover user-level skills
      const userSkillsDir = this.getUserSkillsDirectory();
      try {
        await this.discoverSkillsInDirectory(userSkillsDir, "user");
        if (enableWatch) {
          this.watchDirectory(userSkillsDir, "user");
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        discoveryErrors.push({ scope: "user", error: err });
        logger.error(
          `Failed to discover user-level skills in ${userSkillsDir}:`,
          err,
        );
      }

      // Discover workspace-level skills if workspace root is provided
      if (workspaceRoot) {
        const workspaceSkillsDir =
          this.getWorkspaceSkillsDirectory(workspaceRoot);
        try {
          await this.discoverSkillsInDirectory(workspaceSkillsDir, "workspace");
          if (enableWatch) {
            this.watchDirectory(workspaceSkillsDir, "workspace");
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          discoveryErrors.push({ scope: "workspace", error: err });
          logger.error(
            `Failed to discover workspace-level skills in ${workspaceSkillsDir}:`,
            err,
          );
        }
      }

      // Log summary
      const successCount = this.skills.size;
      const errorCount = discoveryErrors.length;

      if (errorCount > 0) {
        logger.warn(
          `Skill discovery completed with ${errorCount} error(s). Successfully registered ${successCount} skill(s).`,
        );
      } else {
        logger.info(
          `Skill discovery complete. Registered ${successCount} skill(s).${enableWatch ? " File watching enabled." : ""}`,
        );
      }
    } catch (error) {
      // Catch any unexpected errors during the discovery process
      logger.error("Unexpected error during skill discovery:", error);
      // Don't throw - allow the application to continue with whatever skills were registered
    }
  }

  /**
   * Discover and register skills in a specific directory.
   *
   * This method handles errors gracefully:
   * - If the directory doesn't exist, it logs a debug message and returns
   * - If directory reading fails, it logs an error and throws
   * - If individual skill registration fails, it logs a warning and continues
   *
   * @param directory - The directory to scan for skills
   * @param scope - The scope of skills in this directory (user or workspace)
   * @throws Error if the directory cannot be read (but not if it doesn't exist)
   */
  private async discoverSkillsInDirectory(
    directory: string,
    scope: SkillScope,
  ): Promise<void> {
    // Check if directory exists - this is not an error condition
    if (!fs.existsSync(directory)) {
      logger.debug(
        `Skills directory does not exist: ${directory}. This is normal if no ${scope}-level skills have been created yet.`,
      );
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        `Failed to read skills directory ${directory}: ${err.message}`,
        err,
      );
      throw new Error(
        `Cannot read ${scope}-level skills directory: ${err.message}`,
      );
    }

    let successCount = 0;
    let failureCount = 0;

    for (const entry of entries) {
      // Skip non-directory entries
      if (!entry.isDirectory()) {
        logger.debug(
          `Skipping non-directory entry in ${directory}: ${entry.name}`,
        );
        continue;
      }

      const skillDir = path.join(directory, entry.name);
      const skillFilePath = path.join(skillDir, "SKILL.md");

      // Check if SKILL.md exists in this directory
      if (!fs.existsSync(skillFilePath)) {
        logger.debug(
          `Skipping directory ${entry.name}: no SKILL.md file found`,
        );
        continue;
      }

      // Attempt to register the skill
      try {
        const result = await this.register(skillFilePath, scope);
        if (result.success) {
          successCount++;
          logger.debug(
            `Successfully registered ${scope}-level skill: ${result.data.name}`,
          );
        } else {
          failureCount++;
          logger.warn(
            `Failed to register skill from ${skillFilePath}: ${result.error.message}`,
          );
        }
      } catch (error) {
        // Catch any unexpected errors during registration
        failureCount++;
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          `Unexpected error registering skill from ${skillFilePath}:`,
          err,
        );
      }
    }

    // Log summary for this directory
    if (failureCount > 0) {
      logger.info(
        `Discovered ${successCount} ${scope}-level skill(s) in ${directory} (${failureCount} failed)`,
      );
    } else if (successCount > 0) {
      logger.info(
        `Discovered ${successCount} ${scope}-level skill(s) in ${directory}`,
      );
    } else {
      logger.debug(`No valid skills found in ${directory}`);
    }
  }

  /**
   * Register a skill from a file path.
   *
   * @param skillPath - Absolute path to the SKILL.md file
   * @param scope - The scope of the skill (user or workspace)
   * @returns Result indicating success or failure with error details
   */
  async register(
    skillPath: string,
    scope: SkillScope,
  ): Promise<
    { success: true; data: Skill } | { success: false; error: Error }
  > {
    try {
      // Read skill file
      const content = fs.readFileSync(skillPath, "utf-8");

      // Parse skill
      const parseResult = this.parser.parse(content);
      if (!parseResult.success) {
        return {
          success: false,
          error: new Error(parseResult.error.message),
        };
      }

      const parsedSkill = parseResult.data;

      // Validate skill
      const validationResult = this.validator.validate(parsedSkill);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors
          .map((e) => e.message)
          .join(", ");
        return {
          success: false,
          error: new Error(`Validation failed: ${errorMessages}`),
        };
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        validationResult.warnings.forEach((warning) => {
          logger.warn(`Skill ${parsedSkill.name}: ${warning.message}`);
        });
      }

      // Extract namespace if present (e.g., "dyad:lint" -> namespace: "dyad")
      const namespace = parsedSkill.name.includes(":")
        ? parsedSkill.name.split(":")[0]
        : undefined;

      // Create skill object
      const skill: Skill = {
        name: parsedSkill.name,
        description: parsedSkill.description,
        content: parsedSkill.content,
        scope,
        path: skillPath,
        namespace,
      };

      // Register skill (workspace-level overrides user-level)
      const existingSkill = this.skills.get(skill.name);
      if (
        existingSkill &&
        existingSkill.scope === "workspace" &&
        scope === "user"
      ) {
        logger.debug(
          `Skipping user-level skill ${skill.name} (overridden by workspace-level)`,
        );
        return { success: true, data: existingSkill };
      }

      this.skills.set(skill.name, skill);
      logger.info(`Registered ${scope}-level skill: ${skill.name}`);

      return { success: true, data: skill };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Unregister a skill by name.
   *
   * @param name - The name of the skill to unregister
   */
  unregister(name: string): void {
    const skill = this.skills.get(name);
    if (skill) {
      this.skills.delete(name);
      logger.info(`Unregistered skill: ${name}`);
    } else {
      logger.warn(`Attempted to unregister non-existent skill: ${name}`);
    }
  }

  /**
   * Get a skill by name.
   *
   * @param name - The name of the skill to retrieve
   * @returns The skill if found, undefined otherwise
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * List all registered skills, optionally filtered by criteria.
   *
   * @param filter - Optional filter criteria (scope, namespace)
   * @returns Array of skills matching the filter criteria
   *
   * @example
   * ```typescript
   * // List all skills
   * const allSkills = registry.list();
   *
   * // List only workspace-level skills
   * const workspaceSkills = registry.list({ scope: "workspace" });
   *
   * // List skills in a specific namespace
   * const dyadSkills = registry.list({ namespace: "dyad" });
   * ```
   */
  list(filter?: SkillFilter): Skill[] {
    let skills = Array.from(this.skills.values());

    if (filter?.scope) {
      skills = skills.filter((skill) => skill.scope === filter.scope);
    }

    if (filter?.namespace) {
      skills = skills.filter((skill) => skill.namespace === filter.namespace);
    }

    return skills;
  }

  /**
   * Find skills matching a context query.
   * This is used for automatic skill loading based on user context.
   *
   * @param query - The context query (typically user message or current task)
   * @returns Array of matched skills with relevance scores
   *
   * @example
   * ```typescript
   * const matches = await registry.findMatching("I need to run linting checks");
   * // Returns skills related to linting, sorted by relevance
   * ```
   */
  async findMatching(query: string): Promise<MatchedSkill[]> {
    const skills = this.list();
    const matches: MatchedSkill[] = [];

    // Simple keyword-based matching
    // TODO: Implement more sophisticated matching algorithm in context_matcher.ts
    const queryLower = query.toLowerCase();
    const queryTokens = queryLower.split(/\s+/);

    for (const skill of skills) {
      const descriptionLower = skill.description.toLowerCase();
      const nameLower = skill.name.toLowerCase();

      // Count matching tokens
      let matchCount = 0;
      for (const token of queryTokens) {
        if (descriptionLower.includes(token) || nameLower.includes(token)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const relevance = matchCount / queryTokens.length;
        matches.push({
          skill,
          relevance,
          reason: `Matched ${matchCount} keywords in description or name`,
        });
      }
    }

    // Sort by relevance (highest first)
    matches.sort((a, b) => b.relevance - a.relevance);

    return matches;
  }

  /**
   * Clear all registered skills.
   * Primarily used for testing.
   */
  clear(): void {
    this.skills.clear();
    logger.debug("Cleared all registered skills");
  }

  /**
   * Get the total number of registered skills.
   */
  get size(): number {
    return this.skills.size;
  }

  /**
   * Watch a skill directory for file system changes.
   * Automatically re-registers skills when SKILL.md files are created, modified, or deleted.
   *
   * This method handles errors gracefully:
   * - If the directory doesn't exist, it logs a debug message and returns
   * - If watching fails, it logs an error but doesn't throw
   *
   * @param directory - The directory to watch
   * @param scope - The scope of skills in this directory (user or workspace)
   */
  private watchDirectory(directory: string, scope: SkillScope): void {
    // Check if directory exists
    if (!fs.existsSync(directory)) {
      logger.debug(
        `Cannot watch non-existent directory: ${directory}. Will create if skills are added.`,
      );
      return;
    }

    try {
      const watcher = fs.watch(
        directory,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;

          // Only react to SKILL.md file changes
          if (!filename.endsWith("SKILL.md")) return;

          const fullPath = path.join(directory, filename);
          logger.debug(
            `File system event: ${eventType} for ${filename} in ${scope} scope`,
          );

          // Handle file changes with debouncing to avoid multiple rapid events
          this.handleFileChange(fullPath, scope, eventType);
        },
      );

      this.watchers.set(directory, { watcher, directory, scope });
      logger.info(`Watching ${scope}-level skill directory: ${directory}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        `Failed to watch directory ${directory}: ${err.message}. File system changes will not be detected.`,
        err,
      );
      // Don't throw - allow the application to continue without watching
    }
  }

  /**
   * Handle file system changes for skill files.
   * Debounced to avoid processing multiple rapid events for the same file.
   *
   * @param filePath - The path to the changed file
   * @param scope - The scope of the skill
   * @param eventType - The type of file system event (rename or change)
   */
  private handleFileChange(
    filePath: string,
    scope: SkillScope,
    eventType: string,
  ): void {
    // Use a small delay to debounce rapid file system events
    setTimeout(async () => {
      try {
        if (fs.existsSync(filePath)) {
          // File exists: register or update
          logger.info(`Detected ${eventType} for skill file: ${filePath}`);
          const result = await this.register(filePath, scope);

          if (result.success) {
            logger.info(
              `Successfully ${eventType === "rename" ? "registered" : "updated"} skill: ${result.data.name}`,
            );
          } else {
            logger.warn(
              `Failed to register skill from ${filePath}: ${result.error.message}`,
            );
          }
        } else {
          // File deleted: unregister
          // Extract skill name from file path
          const skillDirName = path.basename(path.dirname(filePath));
          const possibleSkillNames = [skillDirName, `${scope}:${skillDirName}`];

          for (const name of possibleSkillNames) {
            const skill = this.skills.get(name);
            if (skill && skill.path === filePath) {
              this.unregister(name);
              logger.info(`Unregistered deleted skill: ${name}`);
              break;
            }
          }
        }
      } catch (error) {
        logger.error(`Error handling file change for ${filePath}:`, error);
      }
    }, 100); // 100ms debounce
  }

  /**
   * Stop watching all skill directories.
   * Closes all active file system watchers.
   *
   * This method handles errors gracefully and continues closing all watchers
   * even if some fail to close properly.
   */
  stopWatching(): void {
    if (this.watchers.size === 0) {
      logger.debug("No active watchers to stop");
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const [directory, { watcher }] of this.watchers.entries()) {
      try {
        watcher.close();
        successCount++;
        logger.debug(`Stopped watching directory: ${directory}`);
      } catch (error) {
        failureCount++;
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          `Error closing watcher for ${directory}: ${err.message}`,
          err,
        );
        // Continue closing other watchers even if this one fails
      }
    }

    this.watchers.clear();
    this.watchEnabled = false;

    if (failureCount > 0) {
      logger.warn(
        `Stopped ${successCount} watcher(s), ${failureCount} failed to close properly`,
      );
    } else {
      logger.info(`Stopped ${successCount} watcher(s)`);
    }
  }

  /**
   * Check if file system watching is currently enabled.
   */
  isWatchEnabled(): boolean {
    return this.watchEnabled;
  }
}

/**
 * Export singleton instance for convenient access.
 */
export const skillRegistry = SkillRegistry.getInstance();
