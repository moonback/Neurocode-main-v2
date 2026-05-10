/**
 * Unit tests for TokenManager
 *
 * Tests budget allocation logic and validation against model limits
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TokenManager, type AgentRequest } from "../TokenManager";
import type { LanguageModel } from "@/ipc/types/language-model";

// Mock the findLanguageModel utility
vi.mock("@/ipc/utils/findLanguageModel", () => ({
  findLanguageModel: vi.fn(),
}));

import { findLanguageModel } from "@/ipc/utils/findLanguageModel";

describe("TokenManager", () => {
  let tokenManager: TokenManager;
  const mockFindLanguageModel = vi.mocked(findLanguageModel);

  beforeEach(() => {
    tokenManager = new TokenManager();
    vi.clearAllMocks();
  });

  describe("allocateBudget", () => {
    it("should allocate 30% of context window for simple tasks", async () => {
      // Mock model with 100k context window
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const request: AgentRequest = {
        requestId: "req-1",
        taskComplexity: "simple",
        model: { name: "test-model", provider: "test-provider" },
      };

      const budget = await tokenManager.allocateBudget(request);

      expect(budget.total).toBe(30_000); // 30% of 100k
      expect(budget.used).toBe(0);
      expect(budget.remaining).toBe(30_000);
      expect(budget.warningThreshold).toBe(24_000); // 80% of 30k
      expect(budget.criticalThreshold).toBe(27_000); // 90% of 30k
    });

    it("should allocate 60% of context window for medium tasks", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const request: AgentRequest = {
        requestId: "req-2",
        taskComplexity: "medium",
        model: { name: "test-model", provider: "test-provider" },
      };

      const budget = await tokenManager.allocateBudget(request);

      expect(budget.total).toBe(60_000); // 60% of 100k
      expect(budget.used).toBe(0);
      expect(budget.remaining).toBe(60_000);
      expect(budget.warningThreshold).toBe(48_000); // 80% of 60k
      expect(budget.criticalThreshold).toBe(54_000); // 90% of 60k
    });

    it("should allocate 85% of context window for complex tasks", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const request: AgentRequest = {
        requestId: "req-3",
        taskComplexity: "complex",
        model: { name: "test-model", provider: "test-provider" },
      };

      const budget = await tokenManager.allocateBudget(request);

      expect(budget.total).toBe(85_000); // 85% of 100k
      expect(budget.used).toBe(0);
      expect(budget.remaining).toBe(85_000);
      expect(budget.warningThreshold).toBe(68_000); // 80% of 85k
      expect(budget.criticalThreshold).toBe(76_500); // 90% of 85k
    });

    it("should account for estimated context tokens", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const request: AgentRequest = {
        requestId: "req-4",
        taskComplexity: "medium",
        model: { name: "test-model", provider: "test-provider" },
        estimatedContextTokens: 10_000,
      };

      const budget = await tokenManager.allocateBudget(request);

      expect(budget.total).toBe(60_000); // 60% of 100k
      expect(budget.used).toBe(10_000);
      expect(budget.remaining).toBe(50_000); // 60k - 10k
    });

    it("should use default context window when model not found", async () => {
      mockFindLanguageModel.mockResolvedValue(undefined);

      const request: AgentRequest = {
        requestId: "req-5",
        taskComplexity: "medium",
        model: { name: "unknown-model", provider: "unknown-provider" },
      };

      const budget = await tokenManager.allocateBudget(request);

      // Default is 128k, medium is 60%
      expect(budget.total).toBe(76_800); // 60% of 128k
    });

    it("should handle remaining tokens correctly when estimated exceeds budget", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const request: AgentRequest = {
        requestId: "req-6",
        taskComplexity: "simple",
        model: { name: "test-model", provider: "test-provider" },
        estimatedContextTokens: 50_000, // More than simple budget of 30k
      };

      const budget = await tokenManager.allocateBudget(request);

      expect(budget.total).toBe(30_000);
      expect(budget.used).toBe(50_000);
      expect(budget.remaining).toBe(0); // Should not be negative
    });
  });

  describe("validateBudget", () => {
    it("should validate budget within context window", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const result = await tokenManager.validateBudget(50_000, {
        name: "test-model",
        provider: "test-provider",
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject budget exceeding context window", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const result = await tokenManager.validateBudget(150_000, {
        name: "test-model",
        provider: "test-provider",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds model context window");
      expect(result.maxAllowed).toBe(100_000);
    });

    it("should reject negative budget", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const result = await tokenManager.validateBudget(-1000, {
        name: "test-model",
        provider: "test-provider",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be positive");
    });

    it("should reject zero budget", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const result = await tokenManager.validateBudget(0, {
        name: "test-model",
        provider: "test-provider",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be positive");
    });

    it("should validate budget at exact context window limit", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "test-model",
        displayName: "Test Model",
        contextWindow: 100_000,
        maxOutputTokens: 50_000,
      } as LanguageModel);

      const result = await tokenManager.validateBudget(100_000, {
        name: "test-model",
        provider: "test-provider",
      });

      expect(result.valid).toBe(true);
    });

    it("should use default context window for unknown models", async () => {
      mockFindLanguageModel.mockResolvedValue(undefined);

      // Default is 128k, so 150k should fail
      const result = await tokenManager.validateBudget(150_000, {
        name: "unknown-model",
        provider: "unknown-provider",
      });

      expect(result.valid).toBe(false);
      expect(result.maxAllowed).toBe(128_000);
    });
  });

  describe("edge cases", () => {
    it("should handle models with very small context windows", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "tiny-model",
        displayName: "Tiny Model",
        contextWindow: 1_000,
        maxOutputTokens: 500,
      } as LanguageModel);

      const request: AgentRequest = {
        requestId: "req-7",
        taskComplexity: "simple",
        model: { name: "tiny-model", provider: "test-provider" },
      };

      const budget = await tokenManager.allocateBudget(request);

      expect(budget.total).toBe(300); // 30% of 1k
      expect(budget.warningThreshold).toBe(240); // 80% of 300
      expect(budget.criticalThreshold).toBe(270); // 90% of 300
    });

    it("should handle models with very large context windows", async () => {
      mockFindLanguageModel.mockResolvedValue({
        apiName: "huge-model",
        displayName: "Huge Model",
        contextWindow: 1_000_000,
        maxOutputTokens: 100_000,
      } as LanguageModel);

      const request: AgentRequest = {
        requestId: "req-8",
        taskComplexity: "complex",
        model: { name: "huge-model", provider: "test-provider" },
      };

      const budget = await tokenManager.allocateBudget(request);

      expect(budget.total).toBe(850_000); // 85% of 1M
      expect(budget.warningThreshold).toBe(680_000); // 80% of 850k
      expect(budget.criticalThreshold).toBe(765_000); // 90% of 850k
    });
  });
});
