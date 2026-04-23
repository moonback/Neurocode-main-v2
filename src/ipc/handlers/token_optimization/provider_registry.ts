// Provider Configuration Registry
// Feature: token-optimization
// Requirements: 3.1, 4.1, 7.3

import { db } from "@/db";
import { providerPricing } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ProviderConfig } from "./types";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

/**
 * Provider Configuration Registry
 * Maps each LLM provider to its context window size, pricing, and optimal token allocation ratios
 *
 * Validates: Requirements 3.1, 4.1, 7.3
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  "openai/gpt-4": {
    providerId: "openai/gpt-4",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 30.0,
      outputTokensPerMillion: 60.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "openai/gpt-4-turbo": {
    providerId: "openai/gpt-4-turbo",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 10.0,
      outputTokensPerMillion: 30.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "openai/gpt-4o": {
    providerId: "openai/gpt-4o",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    pricing: {
      inputTokensPerMillion: 2.5,
      outputTokensPerMillion: 10.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "openai/gpt-4o-mini": {
    providerId: "openai/gpt-4o-mini",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    pricing: {
      inputTokensPerMillion: 0.15,
      outputTokensPerMillion: 0.6,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "openai/o1": {
    providerId: "openai/o1",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    pricing: {
      inputTokensPerMillion: 15.0,
      outputTokensPerMillion: 60.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.65,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.25,
    },
    supportsExtendedContext: false,
  },
  "openai/o1-mini": {
    providerId: "openai/o1-mini",
    contextWindow: 128_000,
    maxOutputTokens: 65_536,
    pricing: {
      inputTokensPerMillion: 3.0,
      outputTokensPerMillion: 12.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.65,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.25,
    },
    supportsExtendedContext: false,
  },
  "anthropic/claude-3-opus": {
    providerId: "anthropic/claude-3-opus",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 15.0,
      outputTokensPerMillion: 75.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "anthropic/claude-3-sonnet": {
    providerId: "anthropic/claude-3-sonnet",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 3.0,
      outputTokensPerMillion: 15.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "anthropic/claude-3-haiku": {
    providerId: "anthropic/claude-3-haiku",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 0.25,
      outputTokensPerMillion: 1.25,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "anthropic/claude-3.5-sonnet": {
    providerId: "anthropic/claude-3.5-sonnet",
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    pricing: {
      inputTokensPerMillion: 3.0,
      outputTokensPerMillion: 15.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "anthropic/claude-3.5-haiku": {
    providerId: "anthropic/claude-3.5-haiku",
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    pricing: {
      inputTokensPerMillion: 0.8,
      outputTokensPerMillion: 4.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "google/gemini-1.5-pro": {
    providerId: "google/gemini-1.5-pro",
    contextWindow: 2_000_000,
    maxOutputTokens: 8_192,
    pricing: {
      inputTokensPerMillion: 1.25,
      outputTokensPerMillion: 5.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.8,
      systemInstructionsRatio: 0.05,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "google/gemini-1.5-flash": {
    providerId: "google/gemini-1.5-flash",
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    pricing: {
      inputTokensPerMillion: 0.075,
      outputTokensPerMillion: 0.3,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.8,
      systemInstructionsRatio: 0.05,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "google/gemini-2.0-flash-exp": {
    providerId: "google/gemini-2.0-flash-exp",
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    pricing: {
      inputTokensPerMillion: 0.0,
      outputTokensPerMillion: 0.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.8,
      systemInstructionsRatio: 0.05,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "azure/gpt-4": {
    providerId: "azure/gpt-4",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 30.0,
      outputTokensPerMillion: 60.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "azure/gpt-4o": {
    providerId: "azure/gpt-4o",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    pricing: {
      inputTokensPerMillion: 2.5,
      outputTokensPerMillion: 10.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "bedrock/claude-3-opus": {
    providerId: "bedrock/claude-3-opus",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 15.0,
      outputTokensPerMillion: 75.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "bedrock/claude-3-sonnet": {
    providerId: "bedrock/claude-3-sonnet",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 3.0,
      outputTokensPerMillion: 15.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "bedrock/claude-3-haiku": {
    providerId: "bedrock/claude-3-haiku",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 0.25,
      outputTokensPerMillion: 1.25,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  "xai/grok-beta": {
    providerId: "xai/grok-beta",
    contextWindow: 131_072,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 5.0,
      outputTokensPerMillion: 15.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "openrouter/auto": {
    providerId: "openrouter/auto",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 5.0,
      outputTokensPerMillion: 15.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "ollama/llama3.1": {
    providerId: "ollama/llama3.1",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 0.0,
      outputTokensPerMillion: 0.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "ollama/qwen2.5-coder": {
    providerId: "ollama/qwen2.5-coder",
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 0.0,
      outputTokensPerMillion: 0.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "lmstudio/local": {
    providerId: "lmstudio/local",
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 0.0,
      outputTokensPerMillion: 0.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "minimax/abab6.5": {
    providerId: "minimax/abab6.5",
    contextWindow: 245_760,
    maxOutputTokens: 8_192,
    pricing: {
      inputTokensPerMillion: 0.5,
      outputTokensPerMillion: 2.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
};

/**
 * Get provider configuration by provider ID
 * Validates: Requirements 3.1, 7.3
 *
 * @param providerId - The provider identifier (e.g., "openai/gpt-4", "anthropic/claude-3.5-sonnet")
 * @returns Provider configuration with context window, pricing, and optimal allocation
 * @throws DyadError with ValidationError kind if provider is not found
 */
export function getProviderConfig(providerId: string): ProviderConfig {
  // First check if we have a static configuration
  const staticConfig = PROVIDER_CONFIGS[providerId];
  if (staticConfig) {
    // Check if we have updated pricing in the database
    try {
      const dbPricing = db
        .select()
        .from(providerPricing)
        .where(eq(providerPricing.providerId, providerId))
        .get();

      if (dbPricing) {
        // Merge database pricing with static config
        return {
          ...staticConfig,
          pricing: {
            inputTokensPerMillion: dbPricing.inputTokensPerMillion,
            outputTokensPerMillion: dbPricing.outputTokensPerMillion,
            lastUpdated: dbPricing.lastUpdated,
          },
        };
      }
    } catch (error) {
      // If database query fails, fall back to static config
      // This ensures the system continues to work even if the database is unavailable
    }

    return staticConfig;
  }

  // Provider not found in static configs
  throw new DyadError(
    `Provider configuration not found: ${providerId}. Supported providers: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`,
    DyadErrorKind.Validation,
  );
}

/**
 * Update provider pricing in the database
 * Validates: Requirements 4.1
 *
 * @param providerId - The provider identifier
 * @param pricing - Updated pricing information
 * @throws DyadError with ValidationError kind if provider is not supported
 */
export async function updateProviderPricing(
  providerId: string,
  pricing: {
    inputTokensPerMillion: number;
    outputTokensPerMillion: number;
  },
): Promise<void> {
  // Validate that the provider exists in our static configs
  if (!PROVIDER_CONFIGS[providerId]) {
    throw new DyadError(
      `Cannot update pricing for unknown provider: ${providerId}`,
      DyadErrorKind.Validation,
    );
  }

  // Validate pricing values
  if (pricing.inputTokensPerMillion < 0 || pricing.outputTokensPerMillion < 0) {
    throw new DyadError(
      "Pricing values must be non-negative",
      DyadErrorKind.Validation,
    );
  }

  // Check if pricing record exists
  const existing = db
    .select()
    .from(providerPricing)
    .where(eq(providerPricing.providerId, providerId))
    .get();

  const now = new Date();

  if (existing) {
    // Update existing record
    db.update(providerPricing)
      .set({
        inputTokensPerMillion: pricing.inputTokensPerMillion,
        outputTokensPerMillion: pricing.outputTokensPerMillion,
        lastUpdated: now,
      })
      .where(eq(providerPricing.providerId, providerId))
      .run();
  } else {
    // Insert new record
    db.insert(providerPricing)
      .values({
        providerId,
        inputTokensPerMillion: pricing.inputTokensPerMillion,
        outputTokensPerMillion: pricing.outputTokensPerMillion,
        lastUpdated: now,
      })
      .run();
  }
}

/**
 * Get all supported provider IDs
 * Validates: Requirements 7.3
 *
 * @returns Array of all supported provider identifiers
 */
export function getSupportedProviders(): string[] {
  return Object.keys(PROVIDER_CONFIGS);
}

/**
 * Check if a provider is supported
 * Validates: Requirements 7.3
 *
 * @param providerId - The provider identifier to check
 * @returns True if the provider is supported, false otherwise
 */
export function isProviderSupported(providerId: string): boolean {
  return providerId in PROVIDER_CONFIGS;
}
