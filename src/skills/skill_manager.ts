import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getUserDataPath } from "../paths/paths";
import { SkillParser } from "./skill_parser";
import { SkillValidator } from "./skill_validator";
import { skillRegistry } from "./skill_registry";
import type { Skill, CreateSkillParams, UpdateSkillParams } from "./types";
import log from "electron-log";

const logger = log.scope("skill-manager");

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * Generate the default SKILL.md content for a newly created skill.
 * Produces a ready-to-edit template so users can fill in instructions immediately.
 */
function buildSkillTemplate(name: string, description: string): string {
  return [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    "---",
    "",
    `# ${name}`,
    "",
    "## Overview",
    "",
    `${description}`,
    "",
    "## Instructions",
    "",
    "<!-- Add your skill instructions here. -->",
    "<!-- You can use {{args}} as a placeholder for user-supplied arguments. -->",
    "",
    "## Examples",
    "",
    "<!-- Provide usage examples. -->",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Directory helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the on-disk base directory for a skill given its scope.
 *
 * - User skills: `~/.neurocode/skills/`
 * - Workspace skills: `.neurocode/skills/` relative to `cwd`
 */
function getSkillsBaseDir(scope: "user" | "workspace"): string {
  if (scope === "user") {
    return path.join(getUserDataPath(), "skills");
  }
  return path.join(process.cwd(), ".neurocode", "skills");
}

/** Full directory path for a single skill (one dir per skill by convention). */
function getSkillDir(name: string, scope: "user" | "workspace"): string {
  // Colon-namespaced skills use the full name as the directory name
  // (e.g. "dyad:lint" → "dyad:lint/") — colons are valid on macOS/Linux;
  // on Windows we replace them with "__" to stay safe.
  const safeName =
    process.platform === "win32" ? name.replace(/:/g, "__") : name;
  return path.join(getSkillsBaseDir(scope), safeName);
}

// ---------------------------------------------------------------------------
// SkillManager
// ---------------------------------------------------------------------------

/**
 * High-level manager for CRUD operations on skills.
 *
 * Responsibilities:
 *  - Writing/reading SKILL.md files on disk.
 *  - Keeping `skillRegistry` in sync after every mutation.
 *  - Producing portable archives for the `export` operation.
 *
 * Prefer this class over calling `skillRegistry` directly for mutations.
 */
export class SkillManager {
  private readonly parser = new SkillParser();
  private readonly validator = new SkillValidator();

  // ── create ──────────────────────────────────────────────────────────────

  /**
   * Create a new skill with a template SKILL.md, write it to disk, and
   * register it in the global skill registry.
   *
   * @throws If the name is invalid, already taken, or the directory cannot
   *         be written.
   */
  async create(params: CreateSkillParams): Promise<Skill> {
    const { name, description, content, scope } = params;

    // Validate before touching the file system
    const rawContent = content?.trim()
      ? `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`
      : buildSkillTemplate(name, description);

    const parseResult = this.parser.parse(rawContent);
    if (!parseResult.success) {
      throw new Error(`Invalid skill content: ${parseResult.error.message}`);
    }
    const validationResult = this.validator.validate(parseResult.data);
    if (!validationResult.valid) {
      const messages = validationResult.errors.map((e) => e.message).join("; ");
      throw new Error(`Skill validation failed: ${messages}`);
    }

    // Ensure no duplicate
    if (skillRegistry.get(name)) {
      throw new Error(
        `A skill named "${name}" already exists. Use update() to modify it.`,
      );
    }

    const dir = getSkillDir(name, scope);
    if (fs.existsSync(dir)) {
      throw new Error(
        `Skill directory "${dir}" already exists on disk but is not registered. ` +
          `Remove or rename the directory and try again.`,
      );
    }

    // Write SKILL.md (create directories as needed)
    const fileContent = content?.trim()
      ? `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`
      : buildSkillTemplate(name, description);

    fs.mkdirSync(dir, { recursive: true });
    const skillPath = path.join(dir, "SKILL.md");
    fs.writeFileSync(skillPath, fileContent, "utf-8");
    logger.info(`Created SKILL.md at: ${skillPath}`);

    // Register in the registry
    const registerResult = await skillRegistry.register(skillPath, scope);
    if (!registerResult.success) {
      // Clean up the partially created directory
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
      throw new Error(
        `Failed to register skill: ${registerResult.error.message}`,
      );
    }

    return registerResult.data;
  }

  // ── update ──────────────────────────────────────────────────────────────

  /**
   * Update an existing skill's description and/or content.
   * Only the provided fields are changed; omitted fields keep their current values.
   *
   * @throws If the skill is not found or the updated content fails validation.
   */
  async update(name: string, params: UpdateSkillParams): Promise<Skill> {
    const existing = skillRegistry.get(name);
    if (!existing) {
      throw new Error(`Skill "${name}" not found.`);
    }

    const newDescription = params.description ?? existing.description;
    const newContent = params.content ?? existing.content;

    // Validate merged result
    const rawContent = `---\nname: ${name}\ndescription: ${newDescription}\n---\n\n${newContent}`;
    const parseResult = this.parser.parse(rawContent);
    if (!parseResult.success) {
      throw new Error(`Invalid skill content: ${parseResult.error.message}`);
    }
    const validationResult = this.validator.validate(parseResult.data);
    if (!validationResult.valid) {
      const messages = validationResult.errors.map((e) => e.message).join("; ");
      throw new Error(`Skill validation failed: ${messages}`);
    }

    // Overwrite the SKILL.md on disk
    fs.writeFileSync(existing.path, rawContent, "utf-8");
    logger.info(`Updated SKILL.md at: ${existing.path}`);

    // Re-register so the in-memory registry reflects the new values
    const registerResult = await skillRegistry.register(
      existing.path,
      existing.scope,
    );
    if (!registerResult.success) {
      throw new Error(
        `Failed to re-register skill after update: ${registerResult.error.message}`,
      );
    }

    return registerResult.data;
  }

  // ── delete ──────────────────────────────────────────────────────────────

  /**
   * Remove a skill from the registry and delete its directory from disk.
   *
   * @throws If the skill is not found or the directory cannot be removed.
   */
  async delete(name: string): Promise<void> {
    const existing = skillRegistry.get(name);
    if (!existing) {
      throw new Error(`Skill "${name}" not found.`);
    }

    const dir = path.dirname(existing.path);

    // Unregister first so the skill is no longer accessible even if disk removal
    // partially fails
    skillRegistry.unregister(name);

    try {
      fs.rmSync(dir, { recursive: true, force: true });
      logger.info(`Deleted skill directory: ${dir}`);
    } catch (err) {
      throw new Error(
        `Skill "${name}" was unregistered but its directory could not be removed: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── export ──────────────────────────────────────────────────────────────

  /**
   * Export a skill as a portable `.tar.gz` archive placed in the system's
   * temporary directory.
   *
   * The archive preserves the skill's directory layout so it can be extracted
   * and imported into another NeuroCode installation:
   *
   * ```
   * <name>/
   *   SKILL.md
   *   [any other files in the skill directory]
   * ```
   *
   * @returns Absolute path to the generated `.tar.gz` file.
   * @throws If the skill is not found or archiving fails.
   */
  async export(name: string): Promise<string> {
    const existing = skillRegistry.get(name);
    if (!existing) {
      throw new Error(`Skill "${name}" not found.`);
    }

    const skillDir = path.dirname(existing.path);
    const safeName = name.replace(/[:/\\]/g, "-");
    const archiveName = `skill-${safeName}-${Date.now()}.tar.gz`;
    const archivePath = path.join(os.tmpdir(), archiveName);

    // Collect all files inside the skill directory recursively
    const files = this.collectFiles(skillDir);

    if (files.length === 0) {
      throw new Error(`No files found in skill directory: ${skillDir}`);
    }

    // Build a pure-JS tar.gz using Node's built-in zlib + manual tar header
    // generation (no native deps required).
    const tarBuffer = this.buildTarGz(skillDir, files, safeName);
    fs.writeFileSync(archivePath, tarBuffer);

    logger.info(`Exported skill "${name}" to: ${archivePath}`);
    return archivePath;
  }

  // ── private helpers ──────────────────────────────────────────────────────

  /** Recursively collect all file paths inside a directory. */
  private collectFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.collectFiles(full));
      } else {
        results.push(full);
      }
    }
    return results;
  }

  /**
   * Build a gzip-compressed tar archive in memory using Node's built-in
   * `zlib` module. No native binaries or third-party packages required.
   *
   * @param baseDir  Root directory of the skill (stripped from archive paths).
   * @param files    Absolute paths to include.
   * @param skillName Safe skill name used as the top-level directory inside the archive.
   */
  private buildTarGz(
    baseDir: string,
    files: string[],
    skillName: string,
  ): Buffer {
    // Build raw tar blocks
    const tarChunks: Buffer[] = [];

    for (const filePath of files) {
      const relPath = path.relative(baseDir, filePath).replace(/\\/g, "/");
      const archivePath = `${skillName}/${relPath}`;
      const fileContent = fs.readFileSync(filePath);

      const header = this.buildTarHeader(archivePath, fileContent.length);
      tarChunks.push(header);
      tarChunks.push(fileContent);

      // Pad file data to a 512-byte boundary
      const remainder = fileContent.length % 512;
      if (remainder > 0) {
        tarChunks.push(Buffer.alloc(512 - remainder));
      }
    }

    // Two 512-byte zero blocks mark the end of a tar archive
    tarChunks.push(Buffer.alloc(1024));

    const tarBuffer = Buffer.concat(tarChunks);

    // gzip compress synchronously
    const { gzipSync } = require("node:zlib") as typeof import("node:zlib");
    return gzipSync(tarBuffer);
  }

  /**
   * Build a POSIX tar header for a single file entry.
   * Uses the ustar format (magic = "ustar").
   */
  private buildTarHeader(filePath: string, fileSize: number): Buffer {
    const header = Buffer.alloc(512);

    // File name (100 bytes, null-padded)
    header.write(filePath.slice(0, 100), 0, "utf-8");
    // File mode: 0o644
    header.write("0000644\0", 100, "ascii");
    // UID / GID
    header.write("0000000\0", 108, "ascii");
    header.write("0000000\0", 116, "ascii");
    // File size in octal (11 digits + null)
    header.write(fileSize.toString(8).padStart(11, "0") + "\0", 124, "ascii");
    // Modification time in octal
    header.write(
      Math.floor(Date.now() / 1000)
        .toString(8)
        .padStart(11, "0") + "\0",
      136,
      "ascii",
    );
    // Link indicator / type flag: '0' = regular file
    header.write("0", 156, "ascii");
    // Magic: ustar
    header.write("ustar  \0", 257, "ascii");

    // Compute checksum: sum of all bytes with checksum field treated as spaces
    header.fill(0x20, 148, 156); // fill checksum field with spaces first
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");

    return header;
  }
}

/**
 * Singleton instance for convenient access throughout the codebase.
 */
export const skillManager = new SkillManager();
