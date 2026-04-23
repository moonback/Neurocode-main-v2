import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMainInvokeEvent } from "electron";
import { streamText } from "ai";
import { handleLocalAgentStream } from "@/pro/main/ipc/handlers/local_agent/local_agent_handler";
import { tokenOptimizer } from "@/ipc/handlers/chat_stream_handlers";
import {
  checkAndMarkForCompaction,
  performCompaction,
  clearPendingCompaction,
  isChatPendingCompaction,
} from "@/ipc/handlers/compaction/compaction_handler";
import { readSettings } from "@/main/settings";
import { db } from "@/db";
import { shouldTriggerCompaction, getContextWindow } from "@/ipc/utils/token_utils";

// Mock dependencies
vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      log: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      chats: {
        findFirst: vi.fn(),
      },
      messages: {
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock("@/main/settings", () => ({
  readSettings: vi.fn(),
}));

vi.mock("@/paths/paths", () => ({
  getDyadAppPath: vi.fn((path) => `/mock/apps/${path}`),
}));

vi.mock("@/ipc/utils/safe_sender", () => ({
  safeSend: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
  stepCountIs: vi.fn(),
  hasToolCall: vi.fn(),
}));

vi.mock("@/ipc/utils/get_model_client", () => ({
  getModelClient: vi.fn(async () => ({
    modelClient: {
      model: { id: "test-model" },
      builtinProviderId: "openai",
    },
  })),
}));

vi.mock("@/ipc/utils/token_utils", () => ({
  getMaxTokens: vi.fn(async () => 4096),
  getTemperature: vi.fn(async () => 0.7),
  getContextWindow: vi.fn(async () => 10000),
  shouldTriggerCompaction: vi.fn(),
}));

vi.mock("@/ipc/utils/provider_options", () => ({
  getProviderOptions: vi.fn(() => ({})),
  getAiHeaders: vi.fn(() => ({})),
  DYAD_INTERNAL_REQUEST_ID_HEADER: "x-dyad-internal-request-id",
}));

vi.mock("@/ipc/handlers/chat_stream_handlers", () => ({
  tokenOptimizer: {
    loadConfig: vi.fn(),
    shouldRunBeforeCompaction: vi.fn(),
    optimizeContext: vi.fn(),
    recordTokenUsage: vi.fn(),
    convertToTokenOptMessages: vi.fn((msgs) => msgs),
    applyOptimizationResult: vi.fn((orig, opt) => opt),
    estimateTokenCount: vi.fn(),
  },
}));

vi.mock("@/ipc/handlers/compaction/compaction_handler", () => ({
  isChatPendingCompaction: vi.fn(),
  performCompaction: vi.fn(),
  checkAndMarkForCompaction: vi.fn(),
  clearPendingCompaction: vi.fn(),
}));

vi.mock("@/pro/main/ipc/handlers/local_agent/tool_definitions", () => ({
  TOOL_DEFINITIONS: [],
  buildAgentToolSet: vi.fn(() => ({})),
  requireAgentToolConsent: vi.fn(),
  clearPendingConsentsForChat: vi.fn(),
  clearPendingQuestionnairesForChat: vi.fn(),
}));

vi.mock("@/pro/main/ipc/handlers/local_agent/todo_persistence", () => ({
  loadTodos: vi.fn(async () => []),
}));

vi.mock("@/ipc/handlers/gitignoreUtils", () => ({
  ensureDyadGitignored: vi.fn(async () => {}),
}));

describe("Local Agent Token Optimization Integration", () => {
  const mockChat = {
    id: 1,
    appId: 100,
    app: { id: 100, path: "test-app" },
    messages: [
      { id: 1, role: "user", content: "Hello", createdAt: new Date() },
      { id: 2, role: "assistant", content: "", createdAt: new Date() }, // placeholder
    ],
  };

  const mockSettings = {
    selectedModel: { provider: "openai", name: "gpt-4" },
    enableDyadPro: true,
    enableContextCompaction: true,
  };

  const mockEvent = {
    sender: {
      isDestroyed: () => false,
      send: vi.fn(),
    },
  } as unknown as IpcMainInvokeEvent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readSettings).mockReturnValue(mockSettings as any);
    vi.mocked(db.query.chats.findFirst).mockResolvedValue(mockChat as any);
    vi.mocked(tokenOptimizer.loadConfig).mockResolvedValue({
      coordinateWithCompaction: true,
      enableAutoPruning: true,
      pruningThreshold: 80,
    } as any);
  });

  it("should run token optimization before LLM call in local agent loop", async () => {
    // Arrange
    vi.mocked(tokenOptimizer.shouldRunBeforeCompaction).mockResolvedValue(true);
    vi.mocked(tokenOptimizer.optimizeContext).mockResolvedValue({
      optimizedMessages: [{ id: 1, role: "user", content: "Hello optimized" }],
      pruningResult: { tokensRemoved: 50 },
    } as any);

    vi.mocked(streamText).mockImplementation((options: any) => {
      return {
        fullStream: (async function* () {
          yield { type: "text-delta", text: "Response" };
        })(),
        response: Promise.resolve({ messages: [] }),
        steps: Promise.resolve([]),
      } as any;
    });

    // Act
    await handleLocalAgentStream(
      mockEvent,
      { chatId: 1, prompt: "Hello" },
      new AbortController(),
      {
        placeholderMessageId: 2,
        systemPrompt: "System",
        dyadRequestId: "req-1",
      }
    );

    // Assert
    expect(tokenOptimizer.shouldRunBeforeCompaction).toHaveBeenCalled();
    expect(tokenOptimizer.optimizeContext).toHaveBeenCalled();
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ id: 1, role: "user", content: "Hello optimized" }],
      })
    );
  });

  it("should record token usage and check compaction after turn finishes", async () => {
    // Arrange
    vi.mocked(tokenOptimizer.shouldRunBeforeCompaction).mockResolvedValue(false);
    
    vi.mocked(streamText).mockImplementation((options: any) => {
      // Simulate calling onFinish
      setTimeout(() => {
        options.onFinish?.({
          usage: { totalTokens: 500, inputTokens: 300, outputTokens: 200 }
        });
      }, 0);

      return {
        fullStream: (async function* () {
          yield { type: "text-delta", text: "Response" };
        })(),
        response: Promise.resolve({ 
          messages: [],
          usage: { totalTokens: 500, inputTokens: 300, outputTokens: 200 }
        }),
        steps: Promise.resolve([]),
      } as any;
    });

    // Act
    await handleLocalAgentStream(
      mockEvent,
      { chatId: 1, prompt: "Hello" },
      new AbortController(),
      {
        placeholderMessageId: 2,
        systemPrompt: "System",
        dyadRequestId: "req-1",
      }
    );

    // Wait for async onFinish
    await new Promise(resolve => setTimeout(resolve, 10));

    // Assert
    expect(tokenOptimizer.recordTokenUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTokens: 300,
        outputTokens: 200,
      })
    );
    expect(checkAndMarkForCompaction).toHaveBeenCalledWith(1, 500);
  });

  it("should skip compaction if token optimization reduced tokens below threshold", async () => {
    // Arrange
    vi.mocked(isChatPendingCompaction).mockResolvedValue(true);
    vi.mocked(tokenOptimizer.shouldRunBeforeCompaction).mockResolvedValue(true);
    vi.mocked(tokenOptimizer.optimizeContext).mockResolvedValue({
      optimizedMessages: [{ id: 1, role: "user", content: "Optimized" }],
    } as any);
    vi.mocked(tokenOptimizer.estimateTokenCount).mockReturnValue(100);
    vi.mocked(shouldTriggerCompaction).mockReturnValue(false);

    vi.mocked(streamText).mockImplementation((options: any) => {
      return {
        fullStream: (async function* () { yield { type: "text-delta", text: "Ok" }; })(),
        response: Promise.resolve({ messages: [] }),
        steps: Promise.resolve([]),
      } as any;
    });

    // Act
    await handleLocalAgentStream(
      mockEvent,
      { chatId: 1, prompt: "Hello" },
      new AbortController(),
      {
        placeholderMessageId: 2,
        systemPrompt: "System",
        dyadRequestId: "req-1",
      }
    );

    // Assert
    expect(tokenOptimizer.optimizeContext).toHaveBeenCalled();
    expect(clearPendingCompaction).toHaveBeenCalledWith(1);
    expect(performCompaction).not.toHaveBeenCalled();
  });
});
