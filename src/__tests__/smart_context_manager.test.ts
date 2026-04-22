import { describe, it, expect, beforeEach, vi } from "vitest";
import { runContextManager, getObservabilityStore } from "../context_manager";
import type { ContextManagerOptions } from "../context_manager";

// Mock dependencies
vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@/main/settings", () => ({
  readSettings: vi.fn(() => ({
    proSmartContextOption: "balanced",
    enableNativeGit: false,
  })),
}));

vi.mock("../utils/codebase", () => ({
  collectFilesNativeGit: vi.fn(async () => []),
  collectFilesIsoGit: vi.fn(async () => []),
  readFileWithCache: vi.fn(async () => undefined),
}));

describe("Context Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runContextManager", () => {
    it("should generate a unique interactionId for each request", async () => {
      const options: ContextManagerOptions = {
        appPath: "/test/workspace",
        activeFilePath: null,
        requestText: "test request",
        chatContext: {
          contextPaths: [],
          smartContextAutoIncludes: [],
          excludePaths: [],
        },
        tokenBudget: 1000,
      };

      const result1 = await runContextManager(options);
      const result2 = await runContextManager(options);

      expect(result1.interactionId).toBeDefined();
      expect(result2.interactionId).toBeDefined();
      expect(result1.interactionId).not.toBe(result2.interactionId);
    });

    it("should return empty context when no candidate files are found", async () => {
      const options: ContextManagerOptions = {
        appPath: "/test/workspace",
        activeFilePath: null,
        requestText: "test request",
        chatContext: {
          contextPaths: [],
          smartContextAutoIncludes: [],
          excludePaths: [],
        },
        tokenBudget: 1000,
      };

      const result = await runContextManager(options);

      expect(result.formattedOutput).toBe("");
      expect(result.includedFiles).toEqual([]);
      expect(result.totalTokensUsed).toBe(0);
      expect(result.interactionId).toBeDefined();
    });

    it("should use the provided strategy", async () => {
      const options: ContextManagerOptions = {
        appPath: "/test/workspace",
        activeFilePath: null,
        requestText: "test request",
        chatContext: {
          contextPaths: [],
          smartContextAutoIncludes: [],
          excludePaths: [],
        },
        strategy: "conservative",
        tokenBudget: 1000,
      };

      const result = await runContextManager(options);

      // Verify observability record was created with correct strategy
      const store = getObservabilityStore();
      const record = store.get(result.interactionId);

      expect(record).not.toHaveProperty("error");
      if ("strategy" in record) {
        expect(record.strategy).toBe("conservative");
      }
    });

    it("should default to balanced strategy when not provided", async () => {
      const options: ContextManagerOptions = {
        appPath: "/test/workspace",
        activeFilePath: null,
        requestText: "test request",
        chatContext: {
          contextPaths: [],
          smartContextAutoIncludes: [],
          excludePaths: [],
        },
        tokenBudget: 1000,
      };

      const result = await runContextManager(options);

      // Verify observability record was created with balanced strategy
      const store = getObservabilityStore();
      const record = store.get(result.interactionId);

      expect(record).not.toHaveProperty("error");
      if ("strategy" in record) {
        expect(record.strategy).toBe("balanced");
      }
    });

    it("should record observability data for each request", async () => {
      const options: ContextManagerOptions = {
        appPath: "/test/workspace",
        activeFilePath: null,
        requestText: "test request",
        chatContext: {
          contextPaths: [],
          smartContextAutoIncludes: [],
          excludePaths: [],
        },
        tokenBudget: 1000,
      };

      const result = await runContextManager(options);
      const store = getObservabilityStore();
      const record = store.get(result.interactionId);

      expect(record).toBeDefined();
      expect(record).not.toHaveProperty("error");

      if ("interactionId" in record) {
        expect(record.interactionId).toBe(result.interactionId);
        expect(record.timestamp).toBeDefined();
        expect(record.includedFiles).toBeDefined();
        expect(record.totalTokensUsed).toBeDefined();
        expect(record.strategy).toBeDefined();
      }
    });
  });

  describe("getObservabilityStore", () => {
    it("should return a singleton instance", () => {
      const store1 = getObservabilityStore();
      const store2 = getObservabilityStore();

      expect(store1).toBe(store2);
    });
  });
});
