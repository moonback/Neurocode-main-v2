import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";
import {
  ContextObservabilityRecordSchema,
  ContextObservabilityResultSchema,
} from "../../lib/schemas";

// =============================================================================
// Smart Context Contracts
// =============================================================================

/**
 * Smart Context contracts define the IPC interface for context observability.
 * These endpoints expose metadata about which files were included in context
 * for each LLM request, along with relevance scores and token usage.
 */
export const smartContextContracts = {
  /**
   * Get context observability data for a specific interaction.
   * Returns the full observability record or an error if not found.
   */
  getContextObservability: defineContract({
    channel: "get-context-observability",
    input: z.object({ interactionId: z.string() }),
    output: ContextObservabilityResultSchema,
  }),

  /**
   * Get recent context observability records.
   * Returns the most recent N interactions (up to 50).
   */
  getRecentContextObservability: defineContract({
    channel: "get-recent-context-observability",
    input: z.void(),
    output: z.array(ContextObservabilityRecordSchema),
  }),
} as const;

// =============================================================================
// Smart Context Client
// =============================================================================

/**
 * Type-safe client for smart context IPC operations.
 * Auto-generated from contracts - method names match contract keys.
 *
 * @example
 * const record = await smartContextClient.getContextObservability({ interactionId: "abc-123" });
 * const recent = await smartContextClient.getRecentContextObservability();
 */
export const smartContextClient = createClient(smartContextContracts);

// =============================================================================
// Type Exports
// =============================================================================

/** Input type for getContextObservability */
export type GetContextObservabilityInput = z.infer<
  (typeof smartContextContracts)["getContextObservability"]["input"]
>;

/** Output type for getContextObservability */
export type GetContextObservabilityOutput = z.infer<
  (typeof smartContextContracts)["getContextObservability"]["output"]
>;

/** Input type for getRecentContextObservability */
export type GetRecentContextObservabilityInput = z.infer<
  (typeof smartContextContracts)["getRecentContextObservability"]["input"]
>;

/** Output type for getRecentContextObservability */
export type GetRecentContextObservabilityOutput = z.infer<
  (typeof smartContextContracts)["getRecentContextObservability"]["output"]
>;
