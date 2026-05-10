/**
 * SkillEngine - Optimized skill execution engine
 * 
 * Provides optimized skill execution with context reuse, parallel execution,
 * concurrency limiting, performance warnings, detailed error reporting, and
 * background preloading with prediction.
 * 
 * Requirements: 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 9.2, 9.3, 9.4, 9.5
 */

import { SkillLoader } from './SkillLoader';
import { ResultCache, type SkillInput } from './ResultCache';
import { PreloaderPredictor, type UsageEvent } from './PreloaderPredictor';
import type { Skill } from '@/skills/types';

export interface ExecutionContext {
  id: string;
  skillName: string;
  inputs: SkillInput;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: Error;
}

export interface ExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number;
  fromCache: boolean;
  context: ExecutionContext;
}

export interface SkillEngineConfig {
  maxConcurrency: number;
  performanceWarningThreshold: number; // milliseconds
  enableResultCache: boolean;
  resultCacheSize: number;
  resultCacheTimeout: number; // minutes
  enablePreloading: boolean;
  preloadingIdleThreshold: number; // milliseconds of idle time before preloading
  preloadingMemoryLimit: number; // max number of skills to preload
  preloadingMaxPredictions: number; // max number of predictions to preload
}

export interface PreloadingStats {
  preloadedSkills: number;
  preloadHits: number;
  preloadMisses: number;
  preloadHitRate: number;
  lastPreloadTime: number | null;
  memoryUsage: number; // number of preloaded skills in memory
}

const DEFAULT_CONFIG: SkillEngineConfig = {
  maxConcurrency: 5,
  performanceWarningThreshold: 5000, // 5 seconds
  enableResultCache: true,
  resultCacheSize: 100,
  resultCacheTimeout: 10,
  enablePreloading: true,
  preloadingIdleThreshold: 2000, // 2 seconds of idle time
  preloadingMemoryLimit: 10, // max 10 preloaded skills
  preloadingMaxPredictions: 5, // preload top 5 predictions
};

export class SkillEngine {
  private loader: SkillLoader;
  private resultCache: ResultCache;
  private predictor: PreloaderPredictor;
  private config: SkillEngineConfig;
  private activeExecutions: Map<string, ExecutionContext>;
  private executionQueue: Array<() => Promise<void>>;
  private runningCount: number;
  private loadedSkills: Map<string, Skill>; // skillName -> Skill object
  private preloadedSkills: Set<string>; // Set of preloaded skill names
  private lastActivityTime: number;
  private idleTimer: NodeJS.Timeout | null;
  private preloadingStats: PreloadingStats;

  constructor(
    loader: SkillLoader,
    config: Partial<SkillEngineConfig> = {}
  ) {
    this.loader = loader;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.resultCache = new ResultCache(
      this.config.resultCacheSize,
      this.config.resultCacheTimeout
    );
    this.predictor = new PreloaderPredictor();
    this.activeExecutions = new Map();
    this.executionQueue = [];
    this.runningCount = 0;
    this.loadedSkills = new Map();
    this.preloadedSkills = new Set();
    this.lastActivityTime = Date.now();
    this.idleTimer = null;
    this.preloadingStats = {
      preloadedSkills: 0,
      preloadHits: 0,
      preloadMisses: 0,
      preloadHitRate: 0,
      lastPreloadTime: null,
      memoryUsage: 0,
    };

    // Start idle detection if preloading is enabled
    if (this.config.enablePreloading) {
      this.startIdleDetection();
    }
  }

  /**
   * Execute a skill with the given inputs
   * @param skillName Name of the skill to execute
   * @param inputs Skill input parameters
   * @param isDeterministic Whether the skill is deterministic (enables result caching)
   * @returns Execution result
   */
  async executeSkill<T = unknown>(
    skillName: string,
    inputs: SkillInput,
    isDeterministic: boolean = false
  ): Promise<ExecutionResult<T>> {
    // Update activity time for idle detection
    this.updateActivity();

    const contextId = this.generateContextId();
    const context: ExecutionContext = {
      id: contextId,
      skillName,
      inputs,
      startTime: Date.now(),
      status: 'pending',
    };

    this.activeExecutions.set(contextId, context);

    // Track if skill was preloaded
    const wasPreloaded = this.preloadedSkills.has(skillName);
    if (wasPreloaded) {
      this.preloadingStats.preloadHits++;
    } else if (this.config.enablePreloading) {
      this.preloadingStats.preloadMisses++;
    }

    // Update preload hit rate
    const totalPreloadAttempts =
      this.preloadingStats.preloadHits + this.preloadingStats.preloadMisses;
    if (totalPreloadAttempts > 0) {
      this.preloadingStats.preloadHitRate =
        this.preloadingStats.preloadHits / totalPreloadAttempts;
    }

    try {
      // Check result cache if enabled and skill is deterministic
      if (this.config.enableResultCache && isDeterministic) {
        const cached = this.resultCache.get(skillName, inputs);
        if (cached) {
          context.status = 'completed';
          context.result = cached.result;
          context.endTime = Date.now();

          // Track usage for prediction
          this.trackSkillUsage(skillName, wasPreloaded);

          return {
            success: true,
            result: cached.result as T,
            executionTime: cached.executionTime,
            fromCache: true,
            context,
          };
        }
      }

      // Wait for concurrency slot
      await this.acquireConcurrencySlot();

      context.status = 'running';

      // Load skill content (with caching via SkillLoader)
      const skillContent = await this.loadSkillContent(skillName);

      // Execute skill (placeholder - actual execution would be implemented)
      const startExecution = Date.now();
      const result = await this.executeSkillContent<T>(
        skillName,
        skillContent,
        inputs
      );
      const executionTime = Date.now() - startExecution;

      // Performance warning
      if (executionTime > this.config.performanceWarningThreshold) {
        console.warn(
          `[SkillEngine] Performance warning: Skill "${skillName}" took ${executionTime}ms to execute (threshold: ${this.config.performanceWarningThreshold}ms)`
        );
      }

      context.status = 'completed';
      context.result = result;
      context.endTime = Date.now();

      // Cache result if deterministic
      if (this.config.enableResultCache && isDeterministic) {
        this.resultCache.put(skillName, inputs, result, executionTime);
      }

      // Track usage for prediction
      this.trackSkillUsage(skillName, wasPreloaded);

      return {
        success: true,
        result,
        executionTime,
        fromCache: false,
        context,
      };
    } catch (error) {
      context.status = 'failed';
      context.error = error as Error;
      context.endTime = Date.now();

      const executionTime = context.endTime - context.startTime;

      // Track usage even on failure
      this.trackSkillUsage(skillName, wasPreloaded);

      return {
        success: false,
        error: error as Error,
        executionTime,
        fromCache: false,
        context,
      };
    } finally {
      this.releaseConcurrencySlot();
      this.activeExecutions.delete(contextId);
    }
  }

  /**
   * Execute multiple skills in parallel with concurrency limiting
   * @param executions Array of skill executions to perform
   * @returns Array of execution results
   */
  async executeParallel<T = unknown>(
    executions: Array<{
      skillName: string;
      inputs: SkillInput;
      isDeterministic?: boolean;
    }>
  ): Promise<Array<ExecutionResult<T>>> {
    // Update activity time for idle detection
    this.updateActivity();

    const promises = executions.map((exec) =>
      this.executeSkill<T>(
        exec.skillName,
        exec.inputs,
        exec.isDeterministic ?? false
      )
    );

    return Promise.all(promises);
  }

  /**
   * Start idle detection for background preloading
   * Requirements: 9.2
   */
  private startIdleDetection(): void {
    // Clear existing timer if any
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // Set up recurring idle check
    const checkIdle = () => {
      const idleTime = Date.now() - this.lastActivityTime;

      if (
        idleTime >= this.config.preloadingIdleThreshold &&
        this.runningCount === 0
      ) {
        // System is idle, trigger preloading
        this.performBackgroundPreloading().catch((error) => {
          console.error('[SkillEngine] Background preloading failed:', error);
        });
      }

      // Schedule next check
      this.idleTimer = setTimeout(
        checkIdle,
        this.config.preloadingIdleThreshold
      );
    };

    // Start checking
    this.idleTimer = setTimeout(checkIdle, this.config.preloadingIdleThreshold);
  }

  /**
   * Update last activity time
   */
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Perform background preloading of predicted skills
   * Requirements: 9.2, 9.3, 9.4
   */
  private async performBackgroundPreloading(): Promise<void> {
    if (!this.config.enablePreloading) {
      return;
    }

    // Check memory limit
    if (this.loadedSkills.size >= this.config.preloadingMemoryLimit) {
      // Evict least recently used preloaded skills
      this.evictPreloadedSkills();
    }

    // Get predictions from predictor
    const predictions = this.predictor.predictSkills();

    // Limit to configured max predictions
    const topPredictions = predictions.slice(
      0,
      this.config.preloadingMaxPredictions
    );

    // Preload skills in priority order
    for (const prediction of topPredictions) {
      // Skip if already loaded
      if (this.loadedSkills.has(prediction.skillName)) {
        continue;
      }

      // Check memory limit again
      if (this.loadedSkills.size >= this.config.preloadingMemoryLimit) {
        break;
      }

      try {
        // Preload the skill
        await this.preloadSkill(prediction.skillName);
        this.preloadingStats.preloadedSkills++;
      } catch (error) {
        console.error(
          `[SkillEngine] Failed to preload skill "${prediction.skillName}":`,
          error
        );
      }
    }

    // Update stats
    this.preloadingStats.lastPreloadTime = Date.now();
    this.preloadingStats.memoryUsage = this.preloadedSkills.size;
  }

  /**
   * Preload a skill into memory
   * Requirements: 9.4, 9.5
   */
  private async preloadSkill(skillName: string): Promise<void> {
    try {
      const result = await this.loader.loadSkill(skillName, 'user');
      if (result.success) {
        this.loadedSkills.set(skillName, result.data);
        this.preloadedSkills.add(skillName);
      }
    } catch (error) {
      throw new Error(`Failed to preload skill "${skillName}": ${error}`);
    }
  }

  /**
   * Evict preloaded skills to free memory
   * Requirements: 9.4
   */
  private evictPreloadedSkills(): void {
    // Get all preloaded skills
    const preloadedArray = Array.from(this.preloadedSkills);

    // Calculate how many to evict (evict 20% to make room)
    const evictCount = Math.max(
      1,
      Math.floor(preloadedArray.length * 0.2)
    );

    // Evict oldest preloaded skills
    for (let i = 0; i < evictCount && i < preloadedArray.length; i++) {
      const skillName = preloadedArray[i];
      this.loadedSkills.delete(skillName);
      this.preloadedSkills.delete(skillName);
    }

    this.preloadingStats.memoryUsage = this.preloadedSkills.size;
  }

  /**
   * Track skill usage for prediction
   */
  private trackSkillUsage(skillName: string, wasPreloaded: boolean): void {
    if (!this.config.enablePreloading) {
      return;
    }

    const event: UsageEvent = {
      skillName,
      timestamp: new Date(),
      wasPreloaded,
    };

    this.predictor.trackUsage(event);
  }

  /**
   * Load skill content with caching
   * @param skillName Name of the skill
   * @returns Skill object
   */
  private async loadSkillContent(skillName: string): Promise<Skill> {
    // Check if already loaded
    if (this.loadedSkills.has(skillName)) {
      return this.loadedSkills.get(skillName)!;
    }

    // Load from SkillLoader
    const result = await this.loader.loadSkill(skillName, 'user');
    if (!result.success) {
      throw new Error(`Failed to load skill "${skillName}": ${result.error}`);
    }

    // Cache the skill
    this.loadedSkills.set(skillName, result.data);

    return result.data;
  }

  /**
   * Execute skill content (placeholder for actual execution logic)
   * @param skillName Name of the skill
   * @param skill Skill object
   * @param inputs Skill inputs
   * @returns Execution result
   */
  private async executeSkillContent<T>(
    skillName: string,
    skill: Skill,
    inputs: SkillInput
  ): Promise<T> {
    // This is a placeholder implementation
    // In a real system, this would:
    // 1. Parse the skill content
    // 2. Set up execution environment
    // 3. Execute the skill logic
    // 4. Return the result

    // For now, simulate execution with a delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Return a mock result
    return {
      skillName,
      inputs,
      output: `Executed ${skillName}`,
    } as T;
  }

  /**
   * Unload a skill from memory
   * @param skillName Name of the skill to unload
   * @returns True if the skill was unloaded, false if it wasn't loaded
   */
  unloadSkill(skillName: string): boolean {
    const wasLoaded = this.loadedSkills.delete(skillName);
    this.preloadedSkills.delete(skillName);
    if (wasLoaded) {
      this.preloadingStats.memoryUsage = this.preloadedSkills.size;
    }
    return wasLoaded;
  }

  /**
   * Unload all skills from memory
   */
  unloadAllSkills(): void {
    this.loadedSkills.clear();
    this.preloadedSkills.clear();
    this.preloadingStats.memoryUsage = 0;
  }

  /**
   * Get active execution contexts
   * @returns Array of active execution contexts
   */
  getActiveExecutions(): ExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get result cache statistics
   */
  getCacheStats() {
    return this.resultCache.getStats();
  }

  /**
   * Get preloading statistics
   * Requirements: 9.6
   */
  getPreloadingStats(): PreloadingStats {
    return { ...this.preloadingStats };
  }

  /**
   * Get prediction accuracy metrics
   * Requirements: 9.6
   */
  getPredictionAccuracy() {
    return this.predictor.measureAccuracy();
  }

  /**
   * Clear result cache
   */
  clearCache(): void {
    this.resultCache.clear();
  }

  /**
   * Invalidate cached results for a specific skill
   * @param skillName Name of the skill
   * @returns Number of entries invalidated
   */
  invalidateSkillCache(skillName: string): number {
    return this.resultCache.invalidateSkill(skillName);
  }

  /**
   * Stop idle detection and cleanup
   */
  destroy(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Generate a unique context ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Acquire a concurrency slot (wait if at max concurrency)
   */
  private async acquireConcurrencySlot(): Promise<void> {
    if (this.runningCount < this.config.maxConcurrency) {
      this.runningCount++;
      return;
    }

    // Wait for a slot to become available
    return new Promise<void>((resolve) => {
      this.executionQueue.push(async () => {
        this.runningCount++;
        resolve();
      });
    });
  }

  /**
   * Release a concurrency slot
   */
  private releaseConcurrencySlot(): void {
    this.runningCount--;

    // Process next queued execution
    const next = this.executionQueue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SkillEngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<SkillEngineConfig>): void {
    this.config = { ...this.config, ...config };

    // Update result cache if size or timeout changed
    if (
      config.resultCacheSize !== undefined ||
      config.resultCacheTimeout !== undefined
    ) {
      this.resultCache = new ResultCache(
        this.config.resultCacheSize,
        this.config.resultCacheTimeout
      );
    }
  }
}
