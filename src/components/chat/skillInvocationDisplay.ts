import { parseCommand } from "@/skills/command_parser";

/** Strip <dyad-attachment> tags from user message content. */
export function stripChatAttachmentTags(content: string): string {
  return content
    .replace(/<dyad-attachment\s+[^>]*><\/dyad-attachment>/g, "")
    .trim();
}

export interface SkillInvocationDisplay {
  name: string;
  command: string;
}

/**
 * Returns display metadata for a user message that invoked a skill via slash command.
 */
export function getSkillInvocationDisplay(
  content: string,
): SkillInvocationDisplay | null {
  const textContent = stripChatAttachmentTags(content);
  const parsed = parseCommand(textContent);

  if (!parsed) {
    return null;
  }

  return {
    name: parsed.skillName,
    command: `/${parsed.skillName}`,
  };
}
