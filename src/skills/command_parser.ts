/**
 * Command parser for skill slash commands.
 *
 * Parses user input like `/skill-name arg1 arg2` into a structured
 * representation with the skill name and extracted arguments.
 */

/**
 * Result of parsing a slash command.
 */
export interface ParsedCommand {
  /** The skill name extracted from the slash command (without the leading `/`) */
  skillName: string;
  /** Arguments passed after the skill name, split by whitespace */
  args: string[];
}

/**
 * Pattern that matches a valid slash command.
 * Requires a leading `/` followed by a valid skill name
 * (lowercase letters, numbers, hyphens, optional namespace with colon).
 */
const SLASH_COMMAND_PATTERN = /^\/([a-z0-9-]+(?::[a-z0-9-]+)?)((?:\s+\S+)*)$/;

/**
 * Determines whether the given input string is a slash command invocation.
 *
 * A slash command starts with `/` followed immediately by a valid skill name
 * (no space between `/` and the name).
 *
 * @param input - Raw user input string
 * @returns `true` if the input looks like a slash command
 */
export function isSlashCommand(input: string): boolean {
  return SLASH_COMMAND_PATTERN.test(input.trim());
}

/**
 * Parses a slash command string into its skill name and arguments.
 *
 * Examples:
 * - `/lint` → `{ skillName: "lint", args: [] }`
 * - `/fix-issue 123` → `{ skillName: "fix-issue", args: ["123"] }`
 * - `/dyad:lint --fix src/` → `{ skillName: "dyad:lint", args: ["--fix", "src/"] }`
 *
 * @param input - Raw user input string starting with `/`
 * @returns Parsed command, or `null` if the input is not a valid slash command
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  const match = SLASH_COMMAND_PATTERN.exec(trimmed);

  if (!match) {
    return null;
  }

  const skillName = match[1]!;
  const argString = match[2]?.trim() ?? "";
  const args = argString.length > 0 ? argString.split(/\s+/) : [];

  return { skillName, args };
}
