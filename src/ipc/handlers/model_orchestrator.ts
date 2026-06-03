import { TextStreamPart, ToolSet } from "ai";
import log from "electron-log";
import { createFullResponseCleaner } from "../utils/streaming_response_cleaner";
import { parseMcpToolKey } from "./tag_parser_service";

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

const logger = log.scope("model_orchestrator");

export function escapeDyadTags(text: string): string {
  // Escape dyad tags in reasoning content
  // We are replacing the opening tag with a look-alike character
  // to avoid issues where thinking content includes dyad tags
  // and are mishandled by:
  // 1. FE markdown parser
  // 2. Main process response processor
  return text
    .replace(/\u003cdyad/g, "＜dyad")
    .replace(/\u003c\/dyad/g, "＜/dyad");
}

export async function processStreamChunks({
  fullStream,
  fullResponse,
  abortController,
  chatId,
  processResponseChunkUpdate,
  escapeDyadTagsFn,
}: {
  fullStream: AsyncIterableStream<TextStreamPart<ToolSet>>;
  fullResponse: string;
  abortController: AbortController;
  chatId: number;
  processResponseChunkUpdate: (params: {
    fullResponse: string;
  }) => Promise<string>;
  escapeDyadTagsFn: (text: string) => string;
}): Promise<{ fullResponse: string; incrementalResponse: string }> {
  let incrementalResponse = "";
  let inThinkingBlock = false;
  const cleanFullResponseForChunk = createFullResponseCleaner();

  for await (const part of fullStream) {
    let chunk = "";
    if (
      inThinkingBlock &&
      !["reasoning-delta", "reasoning-end", "reasoning-start"].includes(
        part.type,
      )
    ) {
      chunk = "</think>";
      inThinkingBlock = false;
    }
    if (part.type === "text-delta") {
      chunk += part.text;
    } else if (part.type === "reasoning-delta") {
      if (!inThinkingBlock) {
        chunk = "<think>";
        inThinkingBlock = true;
      }

      chunk += escapeDyadTagsFn(part.text);
    } else if (part.type === "tool-call") {
      const { serverName, toolName } = parseMcpToolKey(part.toolName);
      const content = escapeDyadTagsFn(JSON.stringify(part.input));
      chunk = `<dyad-mcp-tool-call server="${serverName}" tool="${toolName}">\n${content}\n</dyad-mcp-tool-call>\n`;
    } else if (part.type === "tool-result") {
      const { serverName, toolName } = parseMcpToolKey(part.toolName);
      const content = escapeDyadTagsFn(part.output);
      chunk = `<dyad-mcp-tool-result server="${serverName}" tool="${toolName}">\n${content}\n</dyad-mcp-tool-result>\n`;
    }

    if (!chunk) {
      continue;
    }

    fullResponse += chunk;
    incrementalResponse += chunk;
    fullResponse = cleanFullResponseForChunk(fullResponse, chunk);
    fullResponse = await processResponseChunkUpdate({
      fullResponse,
    });

    // If the stream was aborted, exit early
    if (abortController.signal.aborted) {
      logger.log(`Stream for chat ${chatId} was aborted`);
      break;
    }
  }

  return { fullResponse, incrementalResponse };
}
