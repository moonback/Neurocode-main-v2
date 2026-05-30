import { describe, expect, it } from "vitest";

import {
  getSkillInvocationDisplay,
  stripChatAttachmentTags,
} from "./skillInvocationDisplay";

describe("skillInvocationDisplay", () => {
  it("detects skill slash command display metadata", () => {
    expect(getSkillInvocationDisplay("/lint")).toEqual({
      name: "lint",
      command: "/lint",
    });
  });

  it("keeps detecting skill slash commands when attachments are stored with the message", () => {
    const content = `/examples:code-review src/App.tsx <dyad-attachment name="spec.md" type="text/markdown" url="file://spec.md" path="/tmp/spec.md" attachment-type="chat-context"></dyad-attachment>`;

    expect(stripChatAttachmentTags(content)).toBe(
      "/examples:code-review src/App.tsx",
    );
    expect(getSkillInvocationDisplay(content)).toEqual({
      name: "examples:code-review",
      command: "/examples:code-review",
    });
  });

  it("ignores regular user messages", () => {
    expect(getSkillInvocationDisplay("Please run lint")).toBeNull();
  });
});
