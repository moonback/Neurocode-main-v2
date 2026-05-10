/**
 * ResultCache - Cache for deterministic skill execution results
 *
 * Caches results from deterministic skills to avoid redundant execution.
 * Uses content-based hashing to generate cache keys from skill name and inputs.
 *
 * Requirements: 5.6
 */

import { createHash } from "crypto";
import { SkillCache } from "./SkillCache";

export interface SkillInput {
  [key: string]: unknown;
}

export interface CachedResult<T = unknown> {
  result: T;
  executionTime: number;
  timestamp: number;
}

export class ResultCache<T = unknown> {
  private cache: SkillCache<CachedResult<T>>;

  /**
   * Create a new ResultCache
   * @param maxSize Maximum number of cached results (default: 100)
   * @param idleTimeoutMinutes Idle timeout in minutes (default: 10)
   */
  constructor(maxSize: number = 100, idleTimeoutMinutes: number = 10) {
    this.cache = new SkillCache<CachedResult<T>>(maxSize, idleTimeoutMinutes);
  }

  /**
   * Generate a cache key from skill name and inputs
   * Uses SHA-256 hashing for deterministic key generation
   * @param skillName Name of the skill
   * @param inputs Skill input parameters
   * @returns Cache key string
   */
  private generateCacheKey(skillName: string, inputs: SkillInput): string {
    // Create a stable string representation of inputs
    // Sort keys to ensure consistent ordering
    const sortedInputs = Object.keys(inputs)
      .sort()
      .reduce((acc, key) => {
        acc[key] = inputs[key];
        return acc;
      }, {} as SkillInput);

    const inputString = JSON.stringify(sortedInputs);
    const hash = createHash("sha256")
      .update(`${skillName}:${inputString}`)
      .digest("hex");

    return `${skillName}:${hash}`;
  }

  /**
   * Get a cached result for a skill execution
   * @param skillName Name of the skill
   * @param inputs Skill input parameters
   * @returns Cached result or undefined if not found
   */
  get(skillName: string, inputs: SkillInput): CachedResult<T> | undefined {
    const key = this.generateCacheKey(skillName, inputs);
    return this.cache.get(key);
  }

  /**
   * Cache a skill execution result
   * @param skillName Name of the skill
   * @param inputs Skill input parameters
   * @param result Execution result to cache
   * @param executionTime Execution time in milliseconds
   */
  put(
    skillName: string,
    inputs: SkillInput,
    result: T,
    executionTime: number,
  ): void {
    const key = this.generateCacheKey(skillName, inputs);
    const cachedResult: CachedResult<T> = {
      result,
      executionTime,
      timestamp: Date.now(),
    };

    // Estimate size based on JSON serialization
    const size = JSON.stringify(cachedResult).length;
    this.cache.put(key, cachedResult, size);
  }

  /**
   * Check if a result is cached for a skill execution
   * @param skillName Name of the skill
   * @param inputs Skill input parameters
   * @returns True if a cached result exists
   */
  has(skillName: string, inputs: SkillInput): boolean {
    const key = this.generateCacheKey(skillName, inputs);
    return this.cache.has(key);
  }

  /**
   * Invalidate cached results for a specific skill
   * @param skillName Name of the skill
   * @returns Number of entries invalidated
   */
  invalidateSkill(skillName: string): number {
    let invalidated = 0;
    const entries = this.cache.getEntries();

    for (const entry of entries) {
      if (entry.key.startsWith(`${skillName}:`)) {
        this.cache.evict(entry.key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Get all cached entries
   */
  getEntries() {
    return this.cache.getEntries();
  }

  /**
   * Evict expired entries
   */
  evictExpired(): number {
    return this.cache.evictExpired();
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.cache.resetStats();
  }
}
