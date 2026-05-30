import { cleanFullResponse } from "./cleanFullResponse";

type DyadTagScanState = {
  inOpeningTag: boolean;
  quote: `"` | "'" | null;
  tail: string;
};

function scanDyadOpeningTagChunk(
  state: DyadTagScanState,
  chunk: string,
): boolean {
  let shouldClean = false;

  for (const char of chunk) {
    if (state.inOpeningTag) {
      shouldClean = true;

      if (state.quote) {
        if (char === state.quote) {
          state.quote = null;
        }
        continue;
      }

      if (char === `"` || char === "'") {
        state.quote = char;
        continue;
      }

      if (char === ">") {
        state.inOpeningTag = false;
        state.tail = "";
      }

      continue;
    }

    state.tail = `${state.tail}${char}`.slice(-6);
    if (state.tail === "<dyad-") {
      state.inOpeningTag = true;
      state.quote = null;
      shouldClean = true;
    }
  }

  return shouldClean;
}

export function createFullResponseCleaner() {
  const state: DyadTagScanState = {
    inOpeningTag: false,
    quote: null,
    tail: "",
  };

  return (fullResponse: string, chunk: string) => {
    if (!scanDyadOpeningTagChunk(state, chunk)) {
      return fullResponse;
    }

    return cleanFullResponse(fullResponse);
  };
}
