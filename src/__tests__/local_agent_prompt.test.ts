import { describe, it, expect } from "vitest";
import { constructLocalAgentPrompt } from "../prompts/local_agent_prompt";

describe("local_agent_prompt", () => {
  it("agent mode system prompt", async () => {
    const prompt = await constructLocalAgentPrompt(undefined);
    expect(prompt).toMatchSnapshot();
  });

  it("basic agent mode system prompt", async () => {
    const prompt = await constructLocalAgentPrompt(undefined, undefined, {
      basicAgentMode: true,
    });
    expect(prompt).toMatchSnapshot();
  });

  it("ask mode system prompt", async () => {
    const prompt = await constructLocalAgentPrompt(undefined, undefined, {
      readOnly: true,
    });
    expect(prompt).toMatchSnapshot();
  });
});
