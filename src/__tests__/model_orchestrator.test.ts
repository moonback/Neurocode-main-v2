import { describe, expect, it } from "vitest";
import { createFullResponseCleaner } from "@/ipc/utils/streaming_response_cleaner";

describe("createFullResponseCleaner", () => {
  it("cleans dyad tag attributes even when the opening tag streams in chunks", () => {
    const cleanForChunk = createFullResponseCleaner();
    let fullResponse = "";

    for (const chunk of [
      '<dyad-write path="src/App.tsx" description="Use ',
      "<a>",
      ' tags">content</dyad-write>',
    ]) {
      fullResponse += chunk;
      fullResponse = cleanForChunk(fullResponse, chunk);
    }

    expect(fullResponse).toBe(
      '<dyad-write path="src/App.tsx" description="Use ＜a＞ tags">content</dyad-write>',
    );
  });

  it("does not rescan normal code chunks after a dyad opening tag is closed", () => {
    const cleanForChunk = createFullResponseCleaner();
    let fullResponse = "";

    for (const chunk of [
      '<dyad-write path="src/App.tsx">',
      "const element = <div />;",
      "</dyad-write>",
    ]) {
      fullResponse += chunk;
      fullResponse = cleanForChunk(fullResponse, chunk);
    }

    expect(fullResponse).toBe(
      '<dyad-write path="src/App.tsx">const element = <div />;</dyad-write>',
    );
  });
});
