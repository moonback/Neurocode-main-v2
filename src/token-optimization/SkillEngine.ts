/**
 * SkillEngine - Optimized skill execution engine
 * 
 * Provides optimized skill execution with context reuse, parallel execution,
 * concurrency limiting, performance warnings, and detailed error reporting.
 * 
 * Requirements: 4.7, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { SkillLoader } from './SkillLoader';
import { ResultCache, type SkillInput } from './ResultCache';
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
}

const DEFAULT_CONFIG: SkillEngineConfig = {
  maxConcurrency: 5,
  performanceWarningThreshold: 5000, // 5 seconds
  enableResultCache: true,
  resultCacheSize: 100,
  resultCacheTimeout: 10,
};

export class SkillEngine {
  private loader: SkillLoader;
  private resultCache: ResultCache;
  private config: SkillEngineConfig;
  private activeExecutions: Map<string, ExecutionContext>;
  private executionQueue: Array<() => Promise<void>>;
  private runningCount: number;
  private loadedSkills: Map<string, Skill>; // skillName -> Skill object

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
    this.activeExecutions = new Map();
    this.executionQueue = [];
    this.runningCount = 0;
    this.loadedSkills = new Map();
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
    const contextId = this.generateContextId();
    const context: ExecutionContext = {
      id: contextId,
      skillName,
      inputs,
      startTime: Date.now(),
      status: 'pending',
    };

    this.activeExecutions.set(contextId, context);

    try {
      // Check result cache if enabled and skill is deterministic
      if (this.config.enableResultCache && isDeterministic) {
        const cached = this.resultCache.get(skillName, inputs);
        if (cached) {
          context.status = 'completed';
          context.result = cached.result;
          context.endTime = Date.now();

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
    return this.loadedSkills.delete(skillName);
  }

  /**
   * Unload all skills from memory
   */
  unloadAllSkills(): void {
    this.loadedSkills.clear();
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
