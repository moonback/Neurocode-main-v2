/**
 * Token Optimization Integration
 *
 * This module provides integration points for the token optimization system
 * into the agent request pipeline.
 */

import log from "electron-log";
import { TokenManager, type TokenUsage } from "./TokenManager";
import { ContextOptimizer } from "./ContextOptimizer";
import type { LargeLanguageModel } from "@/lib/schemas";

const logger = log.scope("token-optimization");

// Singleton instances
let tokenManager: TokenManager | null = null;
let contextOptimizer: ContextOptimizer | null = null;

/**
 * Initialize the token optimization system
 */
export function initializeTokenOptimization(): void {
  if (!tokenManager) {
    tokenManager = new TokenManager();
    logger.info("TokenManager initialized");
  }
  if (!contextOptimizer) {
    contextOptimizer = new ContextOptimizer();
    logger.info("ContextOptimizer initialized");
  }
}

/**
 * Get the TokenManager instance (initializes if needed)
 */
export function getTokenManager(): TokenManager {
  if (!tokenManager) {
    initializeTokenOptimization();
  }
  return tokenManager!;
}

/**
 * Get the ContextOptimizer instance (initializes if needed)
 */
export function getContextOptimizer(): ContextOptimizer {
  if (!contextOptimizer) {
    initializeTokenOptimization();
  }
  return contextOptimizer!;
}

/**
 * Allocate token budget for an agent request
 * 
 * @param conversationId - The conversation ID
 * @param model - The model (string name or LargeLanguageModel object)
 * @param taskComplexity - The task complexity level
 * @param requestId - Optional request ID
 * @returns The allocated token budget
 */
export async function allocateTokenBudget(
  conversationId: string,
  model: string | LargeLanguageModel,
  taskComplexity: "simple" | "medium" | "complex",
  requestId?: string,
) {
  const manager = getTokenManager();
  
  // Convert string model name to LargeLanguageModel if needed
  const modelObj: LargeLanguageModel =
    typeof model === "string"
      ? { name: model, provider: "unknown" }
      : model;

  return manager.allocateBudget({
    conversationId,
    model: modelObj,
    taskComplexity,
    requestId: requestId || `req-${Date.now()}`,
  });
}

/**
 * Track token usage for a conversation
 * 
 * @param conversationId - The conversation ID
 * @param tokensUsed - Number of tokens used
 * @param requestId - Optional request ID
 */
export async function trackTokenUsage(
  conversationId: string,
  tokensUsed: number,
  requestId?: string,
): Promise<void> {
  const manager = getTokenManager();
  const usage: TokenUsage = {
    requestId: requestId || `req-${Date.now()}`,
    inputTokens: Math.floor(tokensUsed * 0.7), // Estimate 70% input
    outputTokens: Math.floor(tokensUsed * 0.3), // Estimate 30% output
    totalTokens: tokensUsed,
    timestamp: Date.now(),
    modelType: "unknown",
    conversationId,
  };
  await manager.trackUsage(conversationId, usage);
}

/**
 * Get token usage statistics for a conversation
 * 
 * @param conversationId - The conversation ID
 * @returns Usage statistics
 */
export async function getConversationStats(conversationId: string) {
  const manager = getTokenManager();
  return manager.getStatistics({ conversationId });
}

/**
 * Get top token consumers
 * 
 * @param limit - Maximum number of consumers to return
 * @returns Top consumers
 */
export async function getTopConsumers(limit = 10) {
  const manager = getTokenManager();
  // Get top consumers across all types
  const conversations = manager.getTopConsumers({}, limit, "conversation");
  const skills = manager.getTopConsumers({}, limit, "skill");
  const models = manager.getTopConsumers({}, limit, "model");
  
  return {
    conversations,
    skills,
    models,
  };
}

/**
 * Calculate cost for token usage
 * 
 * @param conversationId - Optional conversation ID to filter by
 * @returns Cost breakdown
 */
export async function calculateCost(conversationId?: string) {
  const manager = getTokenManager();
  const filter = conversationId ? { conversationId } : {};
  return manager.calculateCost(filter);
}

/**
 * Export token usage data
 * 
 * @param format - Export format ('csv' or 'json')
 * @param conversationId - Optional conversation ID to filter by
 * @returns Exported data as string
 */
export async function exportUsageData(
  format: "csv" | "json",
  conversationId?: string,
): Promise<string> {
  const manager = getTokenManager();
  const filter = conversationId ? { conversationId } : {};
  return manager.exportData(format, filter);
}
