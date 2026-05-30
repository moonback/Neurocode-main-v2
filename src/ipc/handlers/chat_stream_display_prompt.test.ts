import { describe, expect, it } from "vitest";
import {
  getStoredUserPrompt,
  replaceLastUserPromptForModel,
} from "./chat_stream_display_prompt";

describe("skill display prompt handling", () => {
  it("stores slash command display text while sending resolved skill content to the model", () => {
    const displayPrompt = "/lint";
    const resolvedSkillContent =
      "Run the lint command and fix reported issues.";

    const storedUserMessage = getStoredUserPrompt({
      displayPrompt,
      displayUserPrompt: resolvedSkillContent,
      userPrompt: resolvedSkillContent,
    });

    expect(storedUserMessage).toBe("/lint");

    const modelMessages = replaceLastUserPromptForModel(
      [
        { role: "user" as const, content: storedUserMessage },
        { role: "assistant" as const, content: "I'll check it." },
        { role: "user" as const, content: storedUserMessage },
      ],
      resolvedSkillContent,
    );

    expect(modelMessages.at(-1)?.content).toBe(resolvedSkillContent);
    expect(modelMessages.at(-1)?.content).not.toBe("/lint");
  });
});
