import log from "electron-log";
import fs from "node:fs";
import path from "node:path";
import { createTypedHandler } from "./base";
import { skillContracts } from "../types/skills";
import { skillRegistry } from "../../skills/skill_registry";
import { SkillParser } from "../../skills/skill_parser";
import { SkillValidator } from "../../skills/skill_validator";
import { getUserDataPath } from "../../paths/paths";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { Skill } from "../../skills/types";

const logger = log.scope("skill_handlers");
const parser = new SkillParser();
const validator = new SkillValidator();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the on-disk directory for a skill given its name and scope.
 * User skills: ~/.neurocode/skills/<name>/
 * Workspace skills: .neurocode/skills/<name>/  (relative to cwd – the app root)
 */
function getSkillDirectory(name: string, scope: "user" | "workspace"): string {
  if (scope === "user") {
    return path.join(getUserDataPath(), "skills", name);
  }
  // Workspace: resolve relative to current working directory (Electron main process cwd).
  return path.join(process.cwd(), ".neurocode", "skills", name);
}

/** Write (create or overwrite) the SKILL.md for a skill. */
function writeSkillFile(
  dir: string,
  name: string,
  description: string,
  content: string,
): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const skillPath = path.join(dir, "SKILL.md");
  const raw = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;
  fs.writeFileSync(skillPath, raw, "utf-8");
  return skillPath;
}

/** Re-register a skill after writing it to disk. */
async function reregisterSkill(
  skillPath: string,
  scope: "user" | "workspace",
): Promise<Skill> {
  const result = await skillRegistry.register(skillPath, scope);
  if (!result.success) {
    throw new DyadError(result.error.message, DyadErrorKind.Validation);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Handler registration
// ---------------------------------------------------------------------------

export function registerSkillHandlers(): void {
  // ── list ──────────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.list, async (_event, filter) => {
    return skillRegistry.list(filter ?? undefined);
  });

  // ── get ───────────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.get, async (_event, name) => {
    const skill = skillRegistry.get(name);
    if (!skill) {
      throw new DyadError(`Skill "${name}" not found`, DyadErrorKind.NotFound);
    }
    return skill;
  });

  // ── create ────────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.create, async (_event, params) => {
    const { name, description, content, scope } = params;

    // Validate name / description / content before touching the file system.
    const parsedResult = parser.parse(
      `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`,
    );
    if (!parsedResult.success) {
      throw new DyadError(parsedResult.error.message, DyadErrorKind.Validation);
    }
    const validationResult = validator.validate(parsedResult.data);
    if (!validationResult.valid) {
      const messages = validationResult.errors.map((e) => e.message).join("; ");
      throw new DyadError(
        `Skill validation failed: ${messages}`,
        DyadErrorKind.Validation,
      );
    }

    // Check for duplicate
    if (skillRegistry.get(name)) {
      throw new DyadError(
        `A skill named "${name}" already exists. Use update to modify it.`,
        DyadErrorKind.Conflict,
      );
    }

    const dir = getSkillDirectory(name, scope);
    const skillPath = writeSkillFile(dir, name, description, content);
    const skill = await reregisterSkill(skillPath, scope);

    logger.info(`Created skill: ${name} (${scope})`);
    return skill;
  });

  // ── update ────────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.update, async (_event, params) => {
    const { name, description, content } = params;

    const existing = skillRegistry.get(name);
    if (!existing) {
      throw new DyadError(`Skill "${name}" not found`, DyadErrorKind.NotFound);
    }

    const newDescription = description ?? existing.description;
    const newContent = content ?? existing.content;

    // Re-validate the merged result
    const parsedResult = parser.parse(
      `---\nname: ${name}\ndescription: ${newDescription}\n---\n\n${newContent}`,
    );
    if (!parsedResult.success) {
      throw new DyadError(parsedResult.error.message, DyadErrorKind.Validation);
    }
    const validationResult = validator.validate(parsedResult.data);
    if (!validationResult.valid) {
      const messages = validationResult.errors.map((e) => e.message).join("; ");
      throw new DyadError(
        `Skill validation failed: ${messages}`,
        DyadErrorKind.Validation,
      );
    }

    // Write updated SKILL.md to the same directory as the existing skill
    const dir = path.dirname(existing.path);
    writeSkillFile(dir, name, newDescription, newContent);
    const skill = await reregisterSkill(existing.path, existing.scope);

    logger.info(`Updated skill: ${name}`);
    return skill;
  });

  // ── delete ────────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.delete, async (_event, name) => {
    const existing = skillRegistry.get(name);
    if (!existing) {
      throw new DyadError(`Skill "${name}" not found`, DyadErrorKind.NotFound);
    }

    const dir = path.dirname(existing.path);
    skillRegistry.unregister(name);

    try {
      fs.rmSync(dir, { recursive: true, force: true });
      logger.info(`Deleted skill: ${name} (directory: ${dir})`);
    } catch (err) {
      logger.error(`Failed to remove skill directory ${dir}:`, err);
      throw new DyadError(
        `Failed to remove skill directory: ${err instanceof Error ? err.message : String(err)}`,
        DyadErrorKind.Internal,
      );
    }

    return { success: true };
  });

  // ── execute ───────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.execute, async (_event, params) => {
    const { name, args } = params;

    const skill = skillRegistry.get(name);
    if (!skill) {
      throw new DyadError(`Skill "${name}" not found`, DyadErrorKind.NotFound);
    }

    // Simple arg interpolation: replace {{args}} placeholder if present.
    const resolvedContent = args
      ? skill.content.replace(/\{\{args\}\}/g, args)
      : skill.content;

    return { content: resolvedContent, skill };
  });

  // ── validate ──────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.validate, async (_event, rawContent) => {
    const parseResult = parser.parse(rawContent);
    if (!parseResult.success) {
      return {
        valid: false,
        errors: [{ code: "PARSE_ERROR", message: parseResult.error.message }],
        warnings: [],
      };
    }
    return validator.validate(parseResult.data);
  });

  // ── discover ──────────────────────────────────────────────────────────────
  createTypedHandler(skillContracts.discover, async () => {
    const before = skillRegistry.size;
    await skillRegistry.discoverAndRegister();
    const after = skillRegistry.size;
    return { discovered: after, registered: after - before };
  });

  logger.debug("Registered skill IPC handlers");
}
