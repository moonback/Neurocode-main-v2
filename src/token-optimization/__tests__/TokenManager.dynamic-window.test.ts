/**
 * Unit tests for TokenManager dynamic context window management
 *
 * Tests Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenManager } from "../TokenManager";
import type { LargeLanguageModel } from "@/lib/schemas";
import type { LanguageModel } from "@/ipc/types/language-model";

// Mock the findLanguageModel utility
vi.mock("@/ipc/utils/findLanguageModel", () => ({
  findLanguageModel: vi.fn(),
}));

import { findLanguageModel } from "@/ipc/utils/findLanguageModel";

describe("TokenManager - Dynamic Context Window Management", () => {
  let tokenManager: TokenManager;
  const mockFindLanguageModel = vi.mocked(findLanguageModel);

  beforeEach(() => {
    tokenManager = new TokenManager();
    vi.clearAllMocks();

    // Default mock for Claude Sonnet with 200k context window
    mockFindLanguageModel.mockResolvedValue({
      apiName: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet",
      contextWindow: 200_000,
      maxOutputTokens: 8_192,
    } as LanguageModel);
  });

  // =============================================================================
  // detectContextWindow() Tests - Requirement 11.1
  // =============================================================================

  describe("detectContextWindow()", () => {
    it("should detect context window for Claude Sonnet model", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);

      expect(contextWindow).toBeGreaterThan(0);
      expect(typeof contextWindow).toBe("number");
    });

    it("should detect context window for Claude Haiku model", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-haiku-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);

      expect(contextWindow).toBeGreaterThan(0);
      expect(typeof contextWindow).toBe("number");
    });

    it("should detect context window for GPT-4o model", async () => {
      const model: LargeLanguageModel = {
        provider: "openai",
        name: "gpt-4o",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);

      expect(contextWindow).toBeGreaterThan(0);
      expect(typeof contextWindow).toBe("number");
    });

    it("should return default context window for unknown model", async () => {
      // Mock unknown model to return undefined (not found)
      mockFindLanguageModel.mockResolvedValueOnce(undefined);

      const model: LargeLanguageModel = {
        provider: "unknown",
        name: "unknown-model",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);

      // Should return default context window (128k)
      expect(contextWindow).toBe(128_000);
    });

    it("should return consistent context window for same model", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow1 = await tokenManager.detectContextWindow(model);
      const contextWindow2 = await tokenManager.detectContextWindow(model);

      expect(contextWindow1).toBe(contextWindow2);
    });
  });

  // =============================================================================
  // adaptiveInclude() Tests - Requirements 11.2, 11.3, 11.5
  // =============================================================================

  describe("adaptiveInclude()", () => {
    interface ContentItem {
      id: string;
      tokens: number;
    }

    it("should include all content when plenty of space available (>50%)", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const currentContextTokens = 10_000; // Small context
      const availableContent: ContentItem[] = [
        { id: "item1", tokens: 1_000 },
        { id: "item2", tokens: 2_000 },
        { id: "item3", tokens: 3_000 },
      ];

      const included = await tokenManager.adaptiveInclude(
        model,
        currentContextTokens,
        availableContent,
      );

      // Should include all items since we have plenty of space
      expect(included.length).toBe(3);
      expect(included).toContainEqual(availableContent[0]);
      expect(included).toContainEqual(availableContent[1]);
      expect(included).toContainEqual(availableContent[2]);
    });

    it("should be selective when limited space available (<50%)", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = Math.floor(contextWindow * 0.6); // 60% used, 40% remaining

      const availableContent: ContentItem[] = [
        { id: "large", tokens: Math.floor(contextWindow * 0.3) },
        { id: "medium", tokens: Math.floor(contextWindow * 0.2) },
        { id: "small", tokens: Math.floor(contextWindow * 0.1) },
      ];

      const included = await tokenManager.adaptiveInclude(
        model,
        currentContextTokens,
        availableContent,
      );

      // Should prioritize smaller items when space is limited
      expect(included.length).toBeGreaterThan(0);
      expect(included.length).toBeLessThan(availableContent.length);

      // Verify we don't exceed available space
      const totalIncludedTokens = included.reduce(
        (sum, item) => sum + item.tokens,
        0,
      );
      const remainingSpace = contextWindow - currentContextTokens;
      expect(totalIncludedTokens).toBeLessThanOrEqual(remainingSpace);
    });

    it("should include nothing when no space available", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = contextWindow; // No space left

      const availableContent: ContentItem[] = [
        { id: "item1", tokens: 1_000 },
        { id: "item2", tokens: 2_000 },
      ];

      const included = await tokenManager.adaptiveInclude(
        model,
        currentContextTokens,
        availableContent,
      );

      expect(included.length).toBe(0);
    });

    it("should maximize utilization when space is limited", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = Math.floor(contextWindow * 0.7); // 70% used
      const remainingSpace = contextWindow - currentContextTokens;

      const availableContent: ContentItem[] = [
        { id: "item1", tokens: Math.floor(remainingSpace * 0.1) },
        { id: "item2", tokens: Math.floor(remainingSpace * 0.15) },
        { id: "item3", tokens: Math.floor(remainingSpace * 0.2) },
        { id: "item4", tokens: Math.floor(remainingSpace * 0.25) },
      ];

      const included = await tokenManager.adaptiveInclude(
        model,
        currentContextTokens,
        availableContent,
      );

      // Should include multiple items to maximize space utilization
      expect(included.length).toBeGreaterThan(1);

      // Verify total doesn't exceed available space
      const totalIncludedTokens = included.reduce(
        (sum, item) => sum + item.tokens,
        0,
      );
      expect(totalIncludedTokens).toBeLessThanOrEqual(remainingSpace);
    });

    it("should handle empty content array", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const included = await tokenManager.adaptiveInclude(model, 10_000, []);

      expect(included.length).toBe(0);
    });

    it("should prefer smaller items when space is limited", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = Math.floor(contextWindow * 0.8); // 80% used
      const remainingSpace = contextWindow - currentContextTokens;

      const availableContent: ContentItem[] = [
        { id: "huge", tokens: remainingSpace + 1000 }, // Too large
        { id: "large", tokens: Math.floor(remainingSpace * 0.6) },
        { id: "small1", tokens: Math.floor(remainingSpace * 0.2) },
        { id: "small2", tokens: Math.floor(remainingSpace * 0.15) },
      ];

      const included = await tokenManager.adaptiveInclude(
        model,
        currentContextTokens,
        availableContent,
      );

      // Should include smaller items
      const includedIds = included.map((item) => item.id);
      expect(includedIds).toContain("small1");
      expect(includedIds).toContain("small2");
      expect(includedIds).not.toContain("huge");
    });

    it("should handle single large item that fits", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const currentContextTokens = 10_000;
      const availableContent: ContentItem[] = [
        { id: "large", tokens: 50_000 },
      ];

      const included = await tokenManager.adaptiveInclude(
        model,
        currentContextTokens,
        availableContent,
      );

      expect(included.length).toBe(1);
      expect(included[0].id).toBe("large");
    });
  });

  // =============================================================================
  // reserveResponseTokens() Tests - Requirement 11.4
  // =============================================================================

  describe("reserveResponseTokens()", () => {
    it("should reserve appropriate tokens for short response", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const reserved = await tokenManager.reserveResponseTokens(model, "short");

      expect(reserved).toBeGreaterThan(0);
      expect(reserved).toBeLessThanOrEqual(1_000);
    });

    it("should reserve appropriate tokens for medium response", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const reserved = await tokenManager.reserveResponseTokens(
        model,
        "medium",
      );

      expect(reserved).toBeGreaterThan(0);
      expect(reserved).toBeLessThanOrEqual(4_000);
    });

    it("should reserve appropriate tokens for long response", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const reserved = await tokenManager.reserveResponseTokens(model, "long");

      expect(reserved).toBeGreaterThan(0);
      expect(reserved).toBeLessThanOrEqual(8_000);
    });

    it("should reserve appropriate tokens for very-long response", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const reserved = await tokenManager.reserveResponseTokens(
        model,
        "very-long",
      );

      expect(reserved).toBeGreaterThan(0);
      expect(reserved).toBeLessThanOrEqual(16_000);
    });

    it("should reserve more tokens for longer responses", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const shortReserved = await tokenManager.reserveResponseTokens(
        model,
        "short",
      );
      const mediumReserved = await tokenManager.reserveResponseTokens(
        model,
        "medium",
      );
      const longReserved = await tokenManager.reserveResponseTokens(
        model,
        "long",
      );
      const veryLongReserved = await tokenManager.reserveResponseTokens(
        model,
        "very-long",
      );

      expect(shortReserved).toBeLessThan(mediumReserved);
      expect(mediumReserved).toBeLessThan(longReserved);
      expect(longReserved).toBeLessThan(veryLongReserved);
    });

    it("should not exceed model max output tokens", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const maxOutput = Math.floor(contextWindow * 0.5); // Typical max output

      const veryLongReserved = await tokenManager.reserveResponseTokens(
        model,
        "very-long",
      );

      expect(veryLongReserved).toBeLessThanOrEqual(maxOutput);
    });

    it("should handle different models consistently", async () => {
      const model1: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const model2: LargeLanguageModel = {
        provider: "openai",
        name: "gpt-4o",
      };

      const reserved1 = await tokenManager.reserveResponseTokens(
        model1,
        "medium",
      );
      const reserved2 = await tokenManager.reserveResponseTokens(
        model2,
        "medium",
      );

      // Both should reserve reasonable amounts
      expect(reserved1).toBeGreaterThan(0);
      expect(reserved2).toBeGreaterThan(0);
      expect(reserved1).toBeLessThanOrEqual(4_000);
      expect(reserved2).toBeLessThanOrEqual(4_000);
    });
  });

  // =============================================================================
  // provideFeedback() Tests - Requirement 11.6
  // =============================================================================

  describe("provideFeedback()", () => {
    it("should provide positive feedback when sufficient space available", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const currentContextTokens = 10_000;
      const requiredTokens = 5_000;

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      expect(feedback).toContain("Sufficient context window available");
    });

    it("should provide detailed feedback when insufficient space", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = Math.floor(contextWindow * 0.9);
      const requiredTokens = Math.floor(contextWindow * 0.5);

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      expect(feedback).toContain("Insufficient context window");
      expect(feedback).toContain("context window of");
      expect(feedback).toContain("tokens available");
      expect(feedback).toContain("requires");
      expect(feedback).toContain("tokens short");
    });

    it("should include model information in feedback", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = contextWindow - 1_000;
      const requiredTokens = 5_000;

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      expect(feedback).toContain("anthropic/claude-3-5-sonnet-20241022");
    });

    it("should include suggestions when insufficient space", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = contextWindow - 1_000;
      const requiredTokens = 5_000;

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      expect(feedback).toContain("Consider:");
      expect(feedback).toContain("larger context window");
      expect(feedback).toContain("reducing the amount of context");
      expect(feedback).toContain("smaller subtasks");
    });

    it("should calculate deficit percentage correctly", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = contextWindow - 5_000; // 5k available
      const requiredTokens = 10_000; // Need 10k (5k short = 50% deficit)

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      expect(feedback).toContain("50.0% deficit");
    });

    it("should handle edge case where required equals available", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = 10_000;
      const availableSpace = contextWindow - currentContextTokens;
      const requiredTokens = availableSpace; // Exactly what's available

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      expect(feedback).toContain("Sufficient context window available");
    });

    it("should format large numbers with locale separators", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = contextWindow - 1_000;
      const requiredTokens = 50_000;

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      // Should contain formatted numbers (with commas)
      expect(feedback).toMatch(/\d{1,3}(,\d{3})*/);
    });

    it("should handle very large deficits", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      const currentContextTokens = contextWindow - 1_000;
      const requiredTokens = contextWindow * 2; // Need 2x the window

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      expect(feedback).toContain("Insufficient context window");
      expect(feedback).toContain("tokens short");
    });
  });

  // =============================================================================
  // Integration Tests - Multiple Methods
  // =============================================================================

  describe("Integration - Dynamic Window Management", () => {
    it("should work together: detect window, reserve tokens, and adapt content", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      // Step 1: Detect context window
      const contextWindow = await tokenManager.detectContextWindow(model);
      expect(contextWindow).toBeGreaterThan(0);

      // Step 2: Reserve tokens for response
      const reservedTokens = await tokenManager.reserveResponseTokens(
        model,
        "medium",
      );
      expect(reservedTokens).toBeGreaterThan(0);

      // Step 3: Calculate available space for context
      const currentContextTokens = 10_000;
      const availableForContent =
        contextWindow - currentContextTokens - reservedTokens;

      // Step 4: Adaptively include content
      const availableContent = [
        { id: "item1", tokens: 1_000 },
        { id: "item2", tokens: 2_000 },
        { id: "item3", tokens: 3_000 },
      ];

      const included = await tokenManager.adaptiveInclude(
        model,
        currentContextTokens + reservedTokens,
        availableContent,
      );

      // Verify we don't exceed available space
      const totalIncludedTokens = included.reduce(
        (sum, item) => sum + item.tokens,
        0,
      );
      expect(totalIncludedTokens).toBeLessThanOrEqual(availableForContent);
    });

    it("should provide feedback when content + reserved tokens exceed window", async () => {
      const model: LargeLanguageModel = {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
      };

      const contextWindow = await tokenManager.detectContextWindow(model);
      await tokenManager.reserveResponseTokens(
        model,
        "very-long",
      );

      const currentContextTokens = Math.floor(contextWindow * 0.8);
      const requiredTokens = Math.floor(contextWindow * 0.5);

      const feedback = await tokenManager.provideFeedback(
        model,
        requiredTokens,
        currentContextTokens,
      );

      // Should indicate insufficient space
      if (currentContextTokens + requiredTokens > contextWindow) {
        expect(feedback).toContain("Insufficient context window");
      }
    });
  });
});
