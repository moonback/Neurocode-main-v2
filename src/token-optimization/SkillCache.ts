/**
 * SkillCache - LRU cache for loaded skills with time-based eviction
 * 
 * Implements an LRU (Least Recently Used) cache for skill content to avoid
 * repeated file I/O operations. Includes time-based eviction (10-minute idle
 * timeout) and cache hit/miss tracking for performance monitoring.
 * 
 * Requirements: 4.3, 4.4, 5.7
 */

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface CacheInfo {
  key: string;
  size: number;
  lastAccessed: number;
  createdAt: number;
}

interface CacheEntry<T> {
  value: T;
  size: number;
  lastAccessed: number;
  createdAt: number;
}

export class SkillCache<T = string> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private idleTimeout: number; // milliseconds
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };

  /**
   * Create a new SkillCache
   * @param maxSize Maximum number of entries in the cache
   * @param idleTimeoutMinutes Idle timeout in minutes (default: 10)
   */
  constructor(maxSize: number = 100, idleTimeoutMinutes: number = 10) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be positive');
    }
    if (idleTimeoutMinutes <= 0) {
      throw new Error('idleTimeoutMinutes must be positive');
    }

    this.cache = new Map();
    this.maxSize = maxSize;
    this.idleTimeout = idleTimeoutMinutes * 60 * 1000; // convert to milliseconds
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.lastAccessed > this.idleTimeout) {
      // Entry has expired, remove it
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = now;
    this.stats.hits++;

    // Move to end (most recently used) by deleting and re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Put a value into the cache
   * @param key Cache key
   * @param value Value to cache
   * @param size Size of the value in bytes (optional, defaults to 1)
   */
  put(key: string, value: T, size: number = 1): void {
    if (size <= 0) {
      throw new Error('size must be positive');
    }

    const now = Date.now();

    // If key already exists, remove it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If cache is at max size, evict least recently used (first entry)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    // Add new entry at the end (most recently used)
    this.cache.set(key, {
      value,
      size,
      lastAccessed: now,
      createdAt: now,
    });
  }

  /**
   * Check if a key exists in the cache (without updating access time)
   * @param key Cache key
   * @returns True if the key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.lastAccessed > this.idleTimeout) {
      // Entry has expired, remove it
      this.cache.delete(key);
      this.stats.evictions++;
      return false;
    }

    return true;
  }

  /**
   * Evict a specific key from the cache
   * @param key Cache key to evict
   * @returns True if the key was evicted, false if it didn't exist
   */
  evict(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.stats.evictions++;
    }
    return existed;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics including hit rate
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
    };
  }

  /**
   * Get information about all cached entries
   * @returns Array of cache entry information
   */
  getEntries(): CacheInfo[] {
    const entries: CacheInfo[] = [];
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        size: entry.size,
        lastAccessed: entry.lastAccessed,
        createdAt: entry.createdAt,
      });
    }
    return entries;
  }

  /**
   * Evict all expired entries from the cache
   * @returns Number of entries evicted
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > this.idleTimeout) {
        this.cache.delete(key);
        this.stats.evictions++;
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }
}
