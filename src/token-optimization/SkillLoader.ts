/**
 * SkillLoader - Handles lazy loading of skills with metadata-only loading
 *
 * This class is responsible for:
 * - Loading skill metadata without full content (Requirements 4.1, 4.2)
 * - Lazy loading of full skill content only when needed
 * - Async loading without blocking the main thread (Requirement 4.5)
 * - Measuring and reporting loading times (Requirement 4.6)
 *
 * Requirements: 4.1, 4.2, 4.5, 4.6
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getUserDataPath } from "@/paths/paths";
import { SkillParser } from "@/skills/skill_parser";
import type { Skill, SkillScope } from "@/skills/types";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Skill metadata without full content
 * Used for lightweight skill discovery and listing
 */
export interface SkillMetadata {
  name: string;
  description: string;
  dependencies: string[];
  estimatedTokens: number;
  scope: "user" | "workspace";
  lastModified: number;
}

/**
 * Performance metrics for skill loading operations
 */
export interface LoadingMetrics {
  skillName: string;
  operation: "loadMetadata" | "loadSkill";
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Result of a skill loading operation
 */
export type LoadResult<T> =
  | { success: true; data: T; metrics: LoadingMetrics }
  | { success: false; error: string; metrics: LoadingMetrics };

// =============================================================================
// Constants
// =============================================================================

/**
 * Estimated tokens per character (heuristic: 4 characters per token)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Regex pattern to extract dependencies from skill content
 * Looks for patterns like: "Requires: skill-name" or "Dependencies: skill1, skill2"
 * Matches until end of line
 */
const DEPENDENCY_PATTERN =
  /(?:requires?|dependencies?):\s*([a-z0-9-:,\s]+?)(?:\n|$)/gim;

// =============================================================================
// SkillLoader Class
// =============================================================================

export class SkillLoader {
  private readonly parser = new SkillParser();

  /**
   * Load skill metadata without loading full content
   *
   * This method reads only the frontmatter section of a SKILL.md file,
   * extracting name, description, and basic metadata without loading
   * the full skill content into memory.
   *
   * @param skillName - Name of the skill to load metadata for
   * @param scope - Scope of the skill (user or workspace)
   * @returns LoadResult with SkillMetadata or error
   *
   * Requirements: 4.1
   */
  async loadMetadata(
    skillName: string,
    scope: SkillScope,
  ): Promise<LoadResult<SkillMetadata>> {
    const startTime = performance.now();
    const operation = "loadMetadata";

    console.log(
      `📖 SkillLoader.loadMetadata: Loading metadata for skill "${skillName}" (scope: ${scope})`,
    );

    try {
      // Get skill file path
      const skillPath = this.getSkillPath(skillName, scope);

      // Check if file exists
      try {
        await fs.access(skillPath);
      } catch {
        const endTime = performance.now();
        console.log(
          `❌ SkillLoader.loadMetadata: Skill file not found: ${skillPath}`,
        );
        return {
          success: false,
          error: `Skill file not found: ${skillPath}`,
          metrics: {
            skillName,
            operation,
            startTime,
            endTime,
            durationMs: endTime - startTime,
            success: false,
            error: "File not found",
          },
        };
      }

      // Read only the frontmatter section and a bit more for dependencies
      // (first ~1000 bytes should be enough for frontmatter + initial content)
      // This avoids loading large skill content into memory
      const fileHandle = await fs.open(skillPath, "r");
      const buffer = Buffer.alloc(1000);
      const { bytesRead } = await fileHandle.read(buffer, 0, 1000, 0);
      await fileHandle.close();

      const partialContent = buffer.toString("utf-8", 0, bytesRead);

      // Extract frontmatter
      const frontmatterMatch = partialContent.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        const endTime = performance.now();
        console.log(
          `❌ SkillLoader.loadMetadata: Invalid skill file (missing frontmatter): ${skillPath}`,
        );
        return {
          success: false,
          error: "Invalid skill file: missing frontmatter",
          metrics: {
            skillName,
            operation,
            startTime,
            endTime,
            durationMs: endTime - startTime,
            success: false,
            error: "Missing frontmatter",
          },
        };
      }

      // Parse frontmatter to extract name and description
      const frontmatterText = frontmatterMatch[1];
      const nameMatch = frontmatterText.match(/name:\s*(.+)/);
      const descriptionMatch = frontmatterText.match(/description:\s*(.+)/);

      if (!nameMatch || !descriptionMatch) {
        const endTime = performance.now();
        console.log(
          `❌ SkillLoader.loadMetadata: Invalid frontmatter (missing name or description): ${skillPath}`,
        );
        return {
          success: false,
          error: "Invalid frontmatter: missing name or description",
          metrics: {
            skillName,
            operation,
            startTime,
            endTime,
            durationMs: endTime - startTime,
            success: false,
            error: "Invalid frontmatter",
          },
        };
      }

      const name = nameMatch[1].trim().replace(/^["']|["']$/g, "");
      const description = descriptionMatch[1]
        .trim()
        .replace(/^["']|["']$/g, "");

      // Get file stats for lastModified
      const stats = await fs.stat(skillPath);

      // Extract dependencies from the partial content (if visible)
      const dependencies = this.extractDependencies(partialContent);

      // Estimate tokens based on file size
      const estimatedTokens = Math.ceil(stats.size / CHARS_PER_TOKEN);

      const endTime = performance.now();
      const metadata: SkillMetadata = {
        name,
        description,
        dependencies,
        estimatedTokens,
        scope,
        lastModified: stats.mtimeMs,
      };

      console.log(
        `✅ SkillLoader.loadMetadata: Successfully loaded metadata for "${skillName}" (${estimatedTokens} tokens, ${(endTime - startTime).toFixed(2)}ms)`,
      );

      return {
        success: true,
        data: metadata,
        metrics: {
          skillName,
          operation,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          success: true,
        },
      };
    } catch (error) {
      const endTime = performance.now();
      console.error(
        `❌ SkillLoader.loadMetadata: Error loading metadata for "${skillName}":`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          skillName,
          operation,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Load full skill with lazy content loading
   *
   * This method loads the complete skill including all content.
   * It should only be called when the skill is actually needed for execution.
   *
   * @param skillName - Name of the skill to load
   * @param scope - Scope of the skill (user or workspace)
   * @returns LoadResult with full Skill object or error
   *
   * Requirements: 4.2, 4.5, 4.6
   */
  async loadSkill(
    skillName: string,
    scope: SkillScope,
  ): Promise<LoadResult<Skill>> {
    const startTime = performance.now();
    const operation = "loadSkill";

    console.log(
      `📚 SkillLoader.loadSkill: Loading full skill "${skillName}" (scope: ${scope})`,
    );

    try {
      // Get skill file path
      const skillPath = this.getSkillPath(skillName, scope);

      // Read full file content asynchronously
      const content = await fs.readFile(skillPath, "utf-8");

      console.log(
        `📄 SkillLoader.loadSkill: Read ${content.length} characters from ${skillPath}`,
      );

      // Parse skill content
      const parseResult = this.parser.parse(content);
      if (!parseResult.success) {
        const endTime = performance.now();
        console.log(
          `❌ SkillLoader.loadSkill: Failed to parse skill "${skillName}": ${parseResult.error.message}`,
        );
        return {
          success: false,
          error: `Failed to parse skill: ${parseResult.error.message}`,
          metrics: {
            skillName,
            operation,
            startTime,
            endTime,
            durationMs: endTime - startTime,
            success: false,
            error: parseResult.error.message,
          },
        };
      }

      // Extract namespace from skill name (e.g., "dyad:lint" -> "dyad")
      const namespace = skillName.includes(":")
        ? skillName.split(":")[0]
        : undefined;

      // Build full Skill object
      const skill: Skill = {
        name: parseResult.data.name,
        description: parseResult.data.description,
        content: parseResult.data.content,
        scope,
        path: skillPath,
        namespace,
      };

      const endTime = performance.now();
      console.log(
        `✅ SkillLoader.loadSkill: Successfully loaded skill "${skillName}" (${(endTime - startTime).toFixed(2)}ms)`,
      );

      return {
        success: true,
        data: skill,
        metrics: {
          skillName,
          operation,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          success: true,
        },
      };
    } catch (error) {
      const endTime = performance.now();
      console.error(
        `❌ SkillLoader.loadSkill: Error loading skill "${skillName}":`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          skillName,
          operation,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get the file system path for a skill
   *
   * @param skillName - Name of the skill
   * @param scope - Scope of the skill (user or workspace)
   * @returns Absolute path to the SKILL.md file
   *
   * @private
   */
  private getSkillPath(skillName: string, scope: SkillScope): string {
    const baseDir = this.getSkillsBaseDir(scope);

    // Handle colon-namespaced skills (e.g., "dyad:lint")
    // On Windows, replace colons with "__" for filesystem compatibility
    const safeName =
      process.platform === "win32" ? skillName.replace(/:/g, "__") : skillName;

    return path.join(baseDir, safeName, "SKILL.md");
  }

  /**
   * Get the base directory for skills based on scope
   *
   * @param scope - Scope of the skill (user or workspace)
   * @returns Absolute path to the skills directory
   *
   * @private
   */
  private getSkillsBaseDir(scope: SkillScope): string {
    if (scope === "user") {
      // User skills: ~/.neurocode/skills/ or equivalent
      return path.join(getUserDataPath(), "skills");
    }
    // Workspace skills: .neurocode/skills/ relative to cwd
    return path.join(process.cwd(), ".neurocode", "skills");
  }

  /**
   * Extract dependencies from skill content
   *
   * Looks for patterns like:
   * - "Requires: skill-name"
   * - "Dependencies: skill1, skill2"
   *
   * @param content - Skill content to extract dependencies from
   * @returns Array of dependency skill names
   *
   * @private
   */
  private extractDependencies(content: string): string[] {
    const dependencies = new Set<string>();
    let match: RegExpExecArray | null;

    // Reset regex state
    DEPENDENCY_PATTERN.lastIndex = 0;

    while ((match = DEPENDENCY_PATTERN.exec(content)) !== null) {
      const depList = match[1];
      // Split by comma and clean up whitespace
      const deps = depList
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      for (const dep of deps) {
        dependencies.add(dep);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * List all available skills in a given scope
   *
   * Returns metadata for all skills without loading full content.
   *
   * @param scope - Scope to list skills from (user or workspace)
   * @returns Array of skill metadata
   */
  async listSkills(scope: SkillScope): Promise<SkillMetadata[]> {
    const baseDir = this.getSkillsBaseDir(scope);

    try {
      // Check if directory exists
      try {
        await fs.access(baseDir);
      } catch {
        // Directory doesn't exist, return empty array
        return [];
      }

      // Read all subdirectories
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      const skillDirs = entries.filter((entry) => entry.isDirectory());

      // Load metadata for each skill
      const metadataPromises = skillDirs.map(async (dir) => {
        // Convert Windows-safe names back to original (__ -> :)
        const skillName =
          process.platform === "win32"
            ? dir.name.replace(/__/g, ":")
            : dir.name;

        const result = await this.loadMetadata(skillName, scope);
        return result.success ? result.data : null;
      });

      const metadataResults = await Promise.all(metadataPromises);

      // Filter out failed loads
      return metadataResults.filter(
        (metadata): metadata is SkillMetadata => metadata !== null,
      );
    } catch (error) {
      console.error(`Failed to list skills in ${scope} scope:`, error);
      return [];
    }
  }
}
