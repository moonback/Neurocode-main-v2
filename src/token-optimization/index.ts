/**
 * Token Optimization Module
 *
 * This module provides token budget management and optimization capabilities
 * for the Dyad/Kiro application.
 */

export {
  TokenManager,
  type TokenBudget,
  type TokenUsage,
  type TokenBudgetConfig,
  type ValidationResult,
  type AgentRequest,
  type StatisticsFilter,
  type UsageStatistics,
  type ConversationStats,
  type SkillStats,
  type ModelStats,
  type TopConsumer,
  type ModelPricing,
  type CostBreakdown,
} from "./TokenManager";

export {
  ContextOptimizer,
  type Context,
  type OptimizedContext,
  type PrunedContext,
  type CompressedContext,
  type ContextMetadata,
  type ConversationTurn,
  type FileContext,
  type SkillContext,
  type OptimizationDebugInfo,
} from "./ContextOptimizer";

export { PruningEngine, type PruningMetrics } from "./PruningEngine";

export {
  CompressionEngine,
  type CompressionMetrics,
} from "./CompressionEngine";

export { AdaptiveSelector } from "./AdaptiveSelector";

export {
  SkillLoader,
  type SkillMetadata,
  type LoadingMetrics,
  type LoadResult,
} from "./SkillLoader";

export { SkillCache, type CacheStats, type CacheInfo } from "./SkillCache";

export { ResultCache, type SkillInput, type CachedResult } from "./ResultCache";

export {
  SkillEngine,
  type ExecutionContext,
  type ExecutionResult,
  type SkillEngineConfig,
  type PreloadingStats,
} from "./SkillEngine";

export {
  PreloaderPredictor,
  type UsagePattern,
  type SkillPrediction,
  type PredictionAccuracy,
  type PredictionConfig,
  type UsageEvent,
} from "./PreloaderPredictor";

export {
  SkillAnalyzer,
  type TokenEstimate,
  type TokenWarning,
  type RedundancyReport,
  type RedundancyItem,
  type OptimizationSuggestion,
  type AnalysisReport,
} from "./SkillAnalyzer";

export {
  SkillParser,
  type ParseResult,
  type ParseError,
  type SkillFrontmatter,
  type FormatOptions,
} from "./SkillParser";

export {
  DependencyManager,
  type DependencyNode,
  type DependencyEdge,
  type DependencyGraph,
  type DependencyResolutionResult,
  type DependencyValidationResult,
} from "./DependencyManager";

// Integration functions
export {
  initializeTokenOptimization,
  getTokenManager,
  getContextOptimizer,
  allocateTokenBudget,
  trackTokenUsage,
  getConversationStats,
  getTopConsumers,
  calculateCost,
  exportUsageData,
} from "./integration";

// Skill system integration
export {
  initializeOptimizedSkillSystem,
  getSkillLoader,
  getSkillCache,
  getSkillEngine,
  getResultCache,
  getPreloaderPredictor,
  loadSkillOptimized,
  executeSkillOptimized,
  preloadPredictedSkills,
  getSkillCacheStats,
  getPreloadingStats,
  clearSkillCaches,
  unloadSkill,
  unloadAllSkills,
} from "./skill-integration";
