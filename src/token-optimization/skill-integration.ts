/**
 * Skill System Integration
 *
 * This module integrates the optimized SkillLoader, SkillCache, and SkillEngine
 * with the existing skill system while maintaining backward compatibility.
 */

import log from "electron-log";
import { SkillLoader } from "./SkillLoader";
import { SkillCache } from "./SkillCache";
import { SkillEngine } from "./SkillEngine";
import { ResultCache } from "./ResultCache";
import { PreloaderPredictor } from "./PreloaderPredictor";
import type { Skill } from "@/skills/types";
import { readSettings } from "@/main/settings";

const logger = log.scope("skill-integration");

// Singleton instances
let skillLoader: SkillLoader | null = null;
let skillCache: SkillCache<Skill> | null = null;
let skillEngine: SkillEngine | null = null;
let resultCache: ResultCache | null = null;
let preloaderPredictor: PreloaderPredictor | null = null;

/**
 * Initialize the optimized skill system
 * 
 * @param config - Optional configuration for the skill engine
 */
export function initializeOptimizedSkillSystem(config?: {
  cacheSize?: number;
  maxConcurrency?: number;
  performanceWarningThreshold?: number;
  enableResultCache?: boolean;
  enablePreloading?: boolean;
}): void {
  // Read settings to get user preferences
  const settings = readSettings();
  
  // Use settings if no config provided
  const effectiveConfig = {
    cacheSize: config?.cacheSize ?? settings.skillCacheSize ?? 50,
    maxConcurrency: config?.maxConcurrency ?? 5,
    performanceWarningThreshold: config?.performanceWarningThreshold ?? 5000,
    enableResultCache: config?.enableResultCache ?? (settings.enableSkillCaching !== false),
    enablePreloading: config?.enablePreloading ?? (settings.enableSkillPreloading !== false),
  };

  if (!skillLoader) {
    skillLoader = new SkillLoader();
    logger.info("SkillLoader initialized");
  }

  if (!skillCache) {
    skillCache = new SkillCache<Skill>(effectiveConfig.cacheSize);
    logger.info(`SkillCache initialized with size ${effectiveConfig.cacheSize}`);
  }

  if (!resultCache) {
    resultCache = new ResultCache();
    logger.info("ResultCache initialized");
  }

  if (!skillEngine) {
    skillEngine = new SkillEngine(skillLoader, {
      maxConcurrency: effectiveConfig.maxConcurrency,
      performanceWarningThreshold: effectiveConfig.performanceWarningThreshold,
      enableResultCache: effectiveConfig.enableResultCache,
      enablePreloading: effectiveConfig.enablePreloading,
      preloadingMemoryLimit: settings.skillPreloadingMemoryLimit ?? 10,
    });
    logger.info("SkillEngine initialized");
  }

  if (!preloaderPredictor && effectiveConfig.enablePreloading) {
    preloaderPredictor = new PreloaderPredictor();
    logger.info("PreloaderPredictor initialized");
  }
}

/**
 * Get the SkillLoader instance (initializes if needed)
 */
export function getSkillLoader(): SkillLoader {
  if (!skillLoader) {
    initializeOptimizedSkillSystem();
  }
  return skillLoader!;
}

/**
 * Get the SkillCache instance (initializes if needed)
 */
export function getSkillCache(): SkillCache<Skill> {
  if (!skillCache) {
    initializeOptimizedSkillSystem();
  }
  return skillCache!;
}

/**
 * Get the SkillEngine instance (initializes if needed)
 */
export function getSkillEngine(): SkillEngine {
  if (!skillEngine) {
    initializeOptimizedSkillSystem();
  }
  return skillEngine!;
}

/**
 * Get the ResultCache instance (initializes if needed)
 */
export function getResultCache(): ResultCache {
  if (!resultCache) {
    initializeOptimizedSkillSystem();
  }
  return resultCache!;
}

/**
 * Get the PreloaderPredictor instance (initializes if needed)
 */
export function getPreloaderPredictor(): PreloaderPredictor | null {
  return preloaderPredictor;
}

/**
 * Load a skill with caching
 * 
 * @param skillName - Name of the skill to load
 * @param scope - Scope of the skill (user or workspace)
 * @returns The loaded skill or null if not found
 */
export async function loadSkillOptimized(
  skillName: string,
  scope: "user" | "workspace",
) {
  const loader = getSkillLoader();
  const cache = getSkillCache();

  // Check cache first
  const cached = cache.get(skillName);
  if (cached) {
    logger.debug(`Cache hit for skill: ${skillName}`);
    return cached;
  }

  // Load from disk
  const result = await loader.loadSkill(skillName, scope);
  if (result.success) {
    // Cache the loaded skill (estimate size based on content length)
    const size = Math.ceil(result.data.content.length / 1000); // Rough estimate in KB
    cache.put(skillName, result.data, size);
    logger.debug(`Loaded and cached skill: ${skillName}`);
    return result.data;
  }

  logger.warn(`Failed to load skill ${skillName}: ${result.error}`);
  return null;
}

/**
 * Execute a skill with caching and performance optimization
 * 
 * @param skillName - Name of the skill to execute
 * @param scope - Scope of the skill (user or workspace)
 * @param context - Execution context for the skill
 * @returns Execution result
 */
export async function executeSkillOptimized(
  skillName: string,
  scope: "user" | "workspace",
  context: Record<string, unknown>,
) {
  const engine = getSkillEngine();
  const predictor = getPreloaderPredictor();

  // Track usage for preloading predictions
  if (predictor) {
    predictor.trackUsage({
      skillName,
      timestamp: new Date(),
      context: JSON.stringify(context),
      wasPreloaded: false, // Will be tracked by SkillEngine
    });
  }

  // Execute the skill
  const result = await engine.executeSkill(skillName, context, false);

  return result;
}

/**
 * Preload skills that are likely to be used next
 * 
 * @param currentContext - Current execution context
 */
export async function preloadPredictedSkills(
  currentContext?: Record<string, unknown>,
): Promise<void> {
  const predictor = getPreloaderPredictor();
  if (!predictor) {
    return;
  }

  const loader = getSkillLoader();
  const cache = getSkillCache();

  // Get predictions
  const predictions = await predictor.predictSkills(
    currentContext ? JSON.stringify(currentContext) : undefined,
  );

  // Preload top predictions
  const topPredictions = predictions.slice(0, 5); // Preload top 5
  for (const prediction of topPredictions) {
    try {
      // Check if already cached
      if (cache.has(prediction.skillName)) {
        continue;
      }

      // Load and cache the skill
      const result = await loader.loadSkill(prediction.skillName, "workspace");
      if (result.success) {
        const size = Math.ceil(result.data.content.length / 1000);
        cache.put(prediction.skillName, result.data, size);
        logger.debug(
          `Preloaded skill: ${prediction.skillName} (confidence: ${prediction.confidence})`,
        );
      }
    } catch (error) {
      logger.warn(`Failed to preload skill ${prediction.skillName}:`, error);
    }
  }
}

/**
 * Get cache statistics
 */
export function getSkillCacheStats() {
  const cache = getSkillCache();
  return cache.getStats();
}

/**
 * Get preloading statistics
 */
export function getPreloadingStats() {
  const engine = getSkillEngine();
  return engine.getPreloadingStats();
}

/**
 * Clear all caches
 */
export function clearSkillCaches(): void {
  const cache = getSkillCache();
  const resultCacheInstance = getResultCache();

  cache.clear();
  resultCacheInstance.clear();

  logger.info("Cleared all skill caches");
}

/**
 * Unload a skill from memory
 * 
 * @param skillName - Name of the skill to unload
 */
export function unloadSkill(skillName: string): void {
  const engine = getSkillEngine();
  engine.unloadSkill(skillName);
  logger.debug(`Unloaded skill: ${skillName}`);
}

/**
 * Unload all skills from memory
 */
export function unloadAllSkills(): void {
  const engine = getSkillEngine();
  engine.unloadAllSkills();
  logger.info("Unloaded all skills from memory");
}
