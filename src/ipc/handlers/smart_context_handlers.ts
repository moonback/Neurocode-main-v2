import { createTypedHandler } from "./base";
import { smartContextContracts } from "../types/smart-context";
import { getObservabilityStore } from "../../context_manager";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

/**
 * Register IPC handlers for smart context observability.
 * These handlers expose metadata about which files were included in context
 * for each LLM request, along with relevance scores and token usage.
 */
export function registerSmartContextHandlers() {
  const store = getObservabilityStore();

  /**
   * Get context observability data for a specific interaction.
   * Returns the full observability record or throws DyadError if not found.
   */
  createTypedHandler(
    smartContextContracts.getContextObservability,
    async (_, params) => {
      const { interactionId } = params;

      if (!interactionId) {
        throw new DyadError(
          "Interaction ID is required",
          DyadErrorKind.Validation,
        );
      }

      const result = store.get(interactionId);

      // If the result is an error object, throw a DyadError
      if ("error" in result) {
        throw new DyadError(result.error, DyadErrorKind.NotFound);
      }

      return result;
    },
  );

  /**
   * Get recent context observability records.
   * Returns the most recent N interactions (up to 50).
   */
  createTypedHandler(
    smartContextContracts.getRecentContextObservability,
    async () => {
      return store.getRecent();
    },
  );
}
