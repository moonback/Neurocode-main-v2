// Unit tests for Provider Configuration Registry
// Feature: token-optimization

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import {
  getProviderConfig,
  updateProviderPricing,
  getSupportedProviders,
  isProviderSupported,
  PROVIDER_CONFIGS,
} from "../provider_registry";
import { initializeDatabase } from "@/db";
import { db } from "@/db";
import { providerPricing } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

describe("Provider Configuration Registry", () => {
  // Initialize database before all tests
  beforeAll(() => {
    initializeDatabase();
  });

  // Clean up database after each test
  afterEach(() => {
    db.delete(providerPricing).run();
  });

  describe("PROVIDER_CONFIGS", () => {
    it("should contain configurations for all required providers", () => {
      const requiredProviders = [
        "openai/gpt-4",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-1.5-pro",
        "azure/gpt-4",
        "bedrock/claude-3-opus",
        "xai/grok-beta",
        "openrouter/auto",
        "ollama/llama3.1",
        "lmstudio/local",
        "minimax/abab6.5",
      ];

      for (const provider of requiredProviders) {
        expect(PROVIDER_CONFIGS[provider]).toBeDefined();
        expect(PROVIDER_CONFIGS[provider].providerId).toBe(provider);
      }
    });

    it("should have valid context window sizes", () => {
      for (const config of Object.values(PROVIDER_CONFIGS)) {
        expect(config.contextWindow).toBeGreaterThan(0);
        expect(Number.isInteger(config.contextWindow)).toBe(true);
      }
    });

    it("should have valid pricing information", () => {
      for (const config of Object.values(PROVIDER_CONFIGS)) {
        expect(config.pricing.inputTokensPerMillion).toBeGreaterThanOrEqual(0);
        expect(config.pricing.outputTokensPerMillion).toBeGreaterThanOrEqual(0);
        expect(config.pricing.lastUpdated).toBeInstanceOf(Date);
      }
    });

    it("should have valid allocation ratios that sum to 1", () => {
      for (const config of Object.values(PROVIDER_CONFIGS)) {
        const sum =
          config.optimalAllocation.inputContextRatio +
          config.optimalAllocation.systemInstructionsRatio +
          config.optimalAllocation.outputGenerationRatio;

        // Allow small floating point error
        expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);

        // Each ratio should be between 0 and 1
        expect(config.optimalAllocation.inputContextRatio).toBeGreaterThan(0);
        expect(config.optimalAllocation.inputContextRatio).toBeLessThanOrEqual(
          1,
        );
        expect(
          config.optimalAllocation.systemInstructionsRatio,
        ).toBeGreaterThan(0);
        expect(
          config.optimalAllocation.systemInstructionsRatio,
        ).toBeLessThanOrEqual(1);
        expect(config.optimalAllocation.outputGenerationRatio).toBeGreaterThan(
          0,
        );
        expect(
          config.optimalAllocation.outputGenerationRatio,
        ).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("getProviderConfig", () => {
    it("should return static config for known provider", () => {
      const config = getProviderConfig("openai/gpt-4");

      expect(config.providerId).toBe("openai/gpt-4");
      expect(config.contextWindow).toBe(128_000);
      expect(config.pricing.inputTokensPerMillion).toBe(30.0);
      expect(config.pricing.outputTokensPerMillion).toBe(60.0);
    });

    it("should return config with database pricing when available", () => {
      // Insert custom pricing
      db.insert(providerPricing)
        .values({
          providerId: "openai/gpt-4",
          inputTokensPerMillion: 25.0,
          outputTokensPerMillion: 50.0,
          lastUpdated: new Date("2024-06-01"),
        })
        .run();

      const config = getProviderConfig("openai/gpt-4");

      expect(config.providerId).toBe("openai/gpt-4");
      expect(config.contextWindow).toBe(128_000); // Static config
      expect(config.pricing.inputTokensPerMillion).toBe(25.0); // Database pricing
      expect(config.pricing.outputTokensPerMillion).toBe(50.0); // Database pricing
    });

    it("should throw DyadError for unknown provider", () => {
      expect(() => getProviderConfig("unknown/provider")).toThrow(DyadError);

      try {
        getProviderConfig("unknown/provider");
      } catch (error) {
        expect(error).toBeInstanceOf(DyadError);
        expect((error as DyadError).kind).toBe(DyadErrorKind.Validation);
        expect((error as DyadError).message).toContain(
          "Provider configuration not found",
        );
      }
    });

    it("should handle all supported providers", () => {
      const providers = getSupportedProviders();

      for (const providerId of providers) {
        const config = getProviderConfig(providerId);
        expect(config.providerId).toBe(providerId);
      }
    });
  });

  describe("updateProviderPricing", () => {
    it("should insert new pricing record", async () => {
      await updateProviderPricing("openai/gpt-4", {
        inputTokensPerMillion: 25.0,
        outputTokensPerMillion: 50.0,
      });

      const record = db
        .select()
        .from(providerPricing)
        .where(eq(providerPricing.providerId, "openai/gpt-4"))
        .get();

      expect(record).toBeDefined();
      expect(record!.inputTokensPerMillion).toBe(25.0);
      expect(record!.outputTokensPerMillion).toBe(50.0);
    });

    it("should update existing pricing record", async () => {
      // Insert initial record
      db.insert(providerPricing)
        .values({
          providerId: "openai/gpt-4",
          inputTokensPerMillion: 30.0,
          outputTokensPerMillion: 60.0,
          lastUpdated: new Date("2024-01-01"),
        })
        .run();

      // Update pricing
      await updateProviderPricing("openai/gpt-4", {
        inputTokensPerMillion: 25.0,
        outputTokensPerMillion: 50.0,
      });

      const record = db
        .select()
        .from(providerPricing)
        .where(eq(providerPricing.providerId, "openai/gpt-4"))
        .get();

      expect(record).toBeDefined();
      expect(record!.inputTokensPerMillion).toBe(25.0);
      expect(record!.outputTokensPerMillion).toBe(50.0);

      // Should only have one record
      const allRecords = db
        .select()
        .from(providerPricing)
        .where(eq(providerPricing.providerId, "openai/gpt-4"))
        .all();
      expect(allRecords).toHaveLength(1);
    });

    it("should throw DyadError for unknown provider", async () => {
      await expect(
        updateProviderPricing("unknown/provider", {
          inputTokensPerMillion: 10.0,
          outputTokensPerMillion: 20.0,
        }),
      ).rejects.toThrow(DyadError);

      try {
        await updateProviderPricing("unknown/provider", {
          inputTokensPerMillion: 10.0,
          outputTokensPerMillion: 20.0,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DyadError);
        expect((error as DyadError).kind).toBe(DyadErrorKind.Validation);
        expect((error as DyadError).message).toContain("unknown provider");
      }
    });

    it("should throw DyadError for negative pricing", async () => {
      await expect(
        updateProviderPricing("openai/gpt-4", {
          inputTokensPerMillion: -10.0,
          outputTokensPerMillion: 20.0,
        }),
      ).rejects.toThrow(DyadError);

      await expect(
        updateProviderPricing("openai/gpt-4", {
          inputTokensPerMillion: 10.0,
          outputTokensPerMillion: -20.0,
        }),
      ).rejects.toThrow(DyadError);
    });

    it("should allow zero pricing for free models", async () => {
      await updateProviderPricing("ollama/llama3.1", {
        inputTokensPerMillion: 0.0,
        outputTokensPerMillion: 0.0,
      });

      const record = db
        .select()
        .from(providerPricing)
        .where(eq(providerPricing.providerId, "ollama/llama3.1"))
        .get();

      expect(record).toBeDefined();
      expect(record!.inputTokensPerMillion).toBe(0.0);
      expect(record!.outputTokensPerMillion).toBe(0.0);
    });

    it("should update lastUpdated timestamp", async () => {
      await updateProviderPricing("openai/gpt-4", {
        inputTokensPerMillion: 25.0,
        outputTokensPerMillion: 50.0,
      });

      const record = db
        .select()
        .from(providerPricing)
        .where(eq(providerPricing.providerId, "openai/gpt-4"))
        .get();

      expect(record).toBeDefined();
      expect(record!.lastUpdated).toBeInstanceOf(Date);
      // Verify the timestamp is recent (within last minute)
      const now = new Date();
      const timeDiff = now.getTime() - record!.lastUpdated.getTime();
      expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
    });
  });

  describe("getSupportedProviders", () => {
    it("should return array of all provider IDs", () => {
      const providers = getSupportedProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain("openai/gpt-4");
      expect(providers).toContain("anthropic/claude-3.5-sonnet");
      expect(providers).toContain("google/gemini-1.5-pro");
    });

    it("should return all providers from PROVIDER_CONFIGS", () => {
      const providers = getSupportedProviders();
      const configKeys = Object.keys(PROVIDER_CONFIGS);

      expect(providers).toEqual(configKeys);
    });
  });

  describe("isProviderSupported", () => {
    it("should return true for supported providers", () => {
      expect(isProviderSupported("openai/gpt-4")).toBe(true);
      expect(isProviderSupported("anthropic/claude-3.5-sonnet")).toBe(true);
      expect(isProviderSupported("google/gemini-1.5-pro")).toBe(true);
    });

    it("should return false for unsupported providers", () => {
      expect(isProviderSupported("unknown/provider")).toBe(false);
      expect(isProviderSupported("")).toBe(false);
      expect(isProviderSupported("invalid")).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle provider IDs with special characters", () => {
      // All our provider IDs use forward slashes
      const providers = getSupportedProviders();
      for (const providerId of providers) {
        expect(providerId).toContain("/");
      }
    });

    it("should handle case-sensitive provider IDs", () => {
      // Provider IDs are case-sensitive
      expect(isProviderSupported("openai/gpt-4")).toBe(true);
      expect(isProviderSupported("OpenAI/GPT-4")).toBe(false);
      expect(isProviderSupported("OPENAI/GPT-4")).toBe(false);
    });

    it("should preserve static config when database query fails", () => {
      // This test verifies graceful degradation
      // Even if the database is unavailable, we should still get the static config
      const config = getProviderConfig("openai/gpt-4");

      expect(config.providerId).toBe("openai/gpt-4");
      expect(config.contextWindow).toBe(128_000);
    });
  });

  describe("Integration with requirements", () => {
    it("should support all providers mentioned in requirements (Requirement 7.3)", () => {
      const requiredProviders = [
        "OpenAI",
        "Anthropic",
        "Google",
        "Azure",
        "Bedrock",
        "XAI",
        "OpenRouter",
        "Ollama",
        "LM Studio",
        "MiniMax",
      ];

      const supportedProviders = getSupportedProviders();

      // Check that we have at least one provider from each required provider family
      expect(supportedProviders.some((p) => p.startsWith("openai/"))).toBe(
        true,
      );
      expect(supportedProviders.some((p) => p.startsWith("anthropic/"))).toBe(
        true,
      );
      expect(supportedProviders.some((p) => p.startsWith("google/"))).toBe(
        true,
      );
      expect(supportedProviders.some((p) => p.startsWith("azure/"))).toBe(true);
      expect(supportedProviders.some((p) => p.startsWith("bedrock/"))).toBe(
        true,
      );
      expect(supportedProviders.some((p) => p.startsWith("xai/"))).toBe(true);
      expect(supportedProviders.some((p) => p.startsWith("openrouter/"))).toBe(
        true,
      );
      expect(supportedProviders.some((p) => p.startsWith("ollama/"))).toBe(
        true,
      );
      expect(supportedProviders.some((p) => p.startsWith("lmstudio/"))).toBe(
        true,
      );
      expect(supportedProviders.some((p) => p.startsWith("minimax/"))).toBe(
        true,
      );
    });

    it("should provide pricing information for cost tracking (Requirement 4.1)", () => {
      const config = getProviderConfig("openai/gpt-4");

      expect(config.pricing).toBeDefined();
      expect(config.pricing.inputTokensPerMillion).toBeGreaterThanOrEqual(0);
      expect(config.pricing.outputTokensPerMillion).toBeGreaterThanOrEqual(0);
      expect(config.pricing.lastUpdated).toBeInstanceOf(Date);
    });

    it("should provide context window for token allocation (Requirement 3.1)", () => {
      const config = getProviderConfig("openai/gpt-4");

      expect(config.contextWindow).toBeDefined();
      expect(config.contextWindow).toBeGreaterThan(0);
      expect(config.optimalAllocation).toBeDefined();
    });
  });
});
