/**
 * Unit tests for SkillCache
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SkillCache } from './SkillCache';

describe('SkillCache', () => {
  let cache: SkillCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new SkillCache<string>(5, 10); // max 5 entries, 10 minute timeout
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create cache with default parameters', () => {
      const defaultCache = new SkillCache();
      const stats = defaultCache.getStats();
      expect(stats.maxSize).toBe(100);
      expect(stats.size).toBe(0);
    });

    it('should create cache with custom parameters', () => {
      const customCache = new SkillCache(50, 5);
      const stats = customCache.getStats();
      expect(stats.maxSize).toBe(50);
    });

    it('should throw error for non-positive maxSize', () => {
      expect(() => new SkillCache(0)).toThrow('maxSize must be positive');
      expect(() => new SkillCache(-1)).toThrow('maxSize must be positive');
    });

    it('should throw error for non-positive idleTimeout', () => {
      expect(() => new SkillCache(10, 0)).toThrow('idleTimeoutMinutes must be positive');
      expect(() => new SkillCache(10, -1)).toThrow('idleTimeoutMinutes must be positive');
    });
  });

  describe('put and get', () => {
    it('should store and retrieve values', () => {
      cache.put('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      cache.put('key1', 'value1');
      cache.put('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
      expect(cache.getStats().size).toBe(1);
    });

    it('should throw error for non-positive size', () => {
      expect(() => cache.put('key1', 'value1', 0)).toThrow('size must be positive');
      expect(() => cache.put('key1', 'value1', -1)).toThrow('size must be positive');
    });

    it('should store size information', () => {
      cache.put('key1', 'value1', 100);
      const entries = cache.getEntries();
      expect(entries[0].size).toBe(100);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when at capacity', () => {
      // Fill cache to capacity
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      cache.put('key4', 'value4');
      cache.put('key5', 'value5');

      // Add one more, should evict key1
      cache.put('key6', 'value6');

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key6')).toBe('value6');
      expect(cache.getStats().size).toBe(5);
      expect(cache.getStats().evictions).toBe(1);
    });

    it('should update LRU order on access', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      cache.put('key4', 'value4');
      cache.put('key5', 'value5');

      // Access key1, making it most recently used
      cache.get('key1');

      // Add one more, should evict key2 (now least recently used)
      cache.put('key6', 'value6');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key6')).toBe('value6');
    });

    it('should update LRU order on put of existing key', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      cache.put('key4', 'value4');
      cache.put('key5', 'value5');

      // Update key1, making it most recently used
      cache.put('key1', 'updated1');

      // Add one more, should evict key2 (now least recently used)
      cache.put('key6', 'value6');

      expect(cache.get('key1')).toBe('updated1');
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('time-based eviction', () => {
    it('should evict entries after idle timeout', () => {
      cache.put('key1', 'value1');

      // Advance time by 11 minutes (past 10 minute timeout)
      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.getStats().evictions).toBe(1);
    });

    it('should not evict entries before idle timeout', () => {
      cache.put('key1', 'value1');

      // Advance time by 9 minutes (before 10 minute timeout)
      vi.advanceTimersByTime(9 * 60 * 1000);

      expect(cache.get('key1')).toBe('value1');
      expect(cache.getStats().evictions).toBe(0);
    });

    it('should reset idle timeout on access', () => {
      cache.put('key1', 'value1');

      // Advance time by 9 minutes
      vi.advanceTimersByTime(9 * 60 * 1000);

      // Access the entry, resetting idle timeout
      cache.get('key1');

      // Advance time by another 9 minutes (18 total, but only 9 since last access)
      vi.advanceTimersByTime(9 * 60 * 1000);

      expect(cache.get('key1')).toBe('value1');
      expect(cache.getStats().evictions).toBe(0);
    });

    it('should evict expired entries in has()', () => {
      cache.put('key1', 'value1');

      // Advance time past timeout
      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(cache.has('key1')).toBe(false);
      expect(cache.getStats().evictions).toBe(1);
    });

    it('should evict multiple expired entries with evictExpired()', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');

      // Advance time past timeout
      vi.advanceTimersByTime(11 * 60 * 1000);

      const evicted = cache.evictExpired();
      expect(evicted).toBe(3);
      expect(cache.getStats().size).toBe(0);
      expect(cache.getStats().evictions).toBe(3);
    });

    it('should only evict expired entries with evictExpired()', () => {
      cache.put('key1', 'value1');

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      cache.put('key2', 'value2');

      // Advance time by another 6 minutes (11 total for key1, 6 for key2)
      vi.advanceTimersByTime(6 * 60 * 1000);

      const evicted = cache.evictExpired();
      expect(evicted).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.put('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should not update access time', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      cache.put('key4', 'value4');
      cache.put('key5', 'value5');

      // Check key1 without updating access time
      cache.has('key1');

      // Add one more, should still evict key1
      cache.put('key6', 'value6');

      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('evict', () => {
    it('should evict specific keys', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');

      const evicted = cache.evict('key1');

      expect(evicted).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.getStats().evictions).toBe(1);
    });

    it('should return false for non-existent keys', () => {
      const evicted = cache.evict('nonexistent');
      expect(evicted).toBe(false);
      expect(cache.getStats().evictions).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
      expect(cache.getStats().evictions).toBe(3);
    });

    it('should work on empty cache', () => {
      cache.clear();
      expect(cache.getStats().size).toBe(0);
      expect(cache.getStats().evictions).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      cache.put('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      cache.get('key3'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should calculate hit rate correctly', () => {
      cache.put('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key1'); // hit

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(1.0);
    });

    it('should handle zero requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should track evictions', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      cache.put('key4', 'value4');
      cache.put('key5', 'value5');
      cache.put('key6', 'value6'); // evicts key1

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should track current size', () => {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });
  });

  describe('getEntries', () => {
    it('should return all cache entries', () => {
      cache.put('key1', 'value1', 100);
      cache.put('key2', 'value2', 200);

      const entries = cache.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].key).toBe('key1');
      expect(entries[0].size).toBe(100);
      expect(entries[1].key).toBe('key2');
      expect(entries[1].size).toBe(200);
    });

    it('should include timestamps', () => {
      const startTime = Date.now();
      cache.put('key1', 'value1');

      const entries = cache.getEntries();
      expect(entries[0].createdAt).toBeGreaterThanOrEqual(startTime);
      expect(entries[0].lastAccessed).toBeGreaterThanOrEqual(startTime);
    });

    it('should return empty array for empty cache', () => {
      const entries = cache.getEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('resetStats', () => {
    it('should reset statistics', () => {
      cache.put('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      cache.put('key4', 'value4');
      cache.put('key5', 'value5');
      cache.put('key6', 'value6'); // eviction

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.hitRate).toBe(0);
      // Size should not be reset
      expect(stats.size).toBe(5);
    });
  });

  describe('generic type support', () => {
    it('should support different value types', () => {
      const numberCache = new SkillCache<number>(5);
      numberCache.put('key1', 42);
      expect(numberCache.get('key1')).toBe(42);

      const objectCache = new SkillCache<{ name: string }>(5);
      objectCache.put('key1', { name: 'test' });
      expect(objectCache.get('key1')).toEqual({ name: 'test' });
    });
  });

  describe('edge cases', () => {
    it('should handle single entry cache', () => {
      const singleCache = new SkillCache<string>(1);
      singleCache.put('key1', 'value1');
      singleCache.put('key2', 'value2'); // evicts key1

      expect(singleCache.get('key1')).toBeUndefined();
      expect(singleCache.get('key2')).toBe('value2');
    });

    it('should handle rapid put/get operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.put(`key${i}`, `value${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBe(5); // max size
      expect(stats.evictions).toBe(95); // 100 - 5
    });

    it('should handle empty string keys', () => {
      cache.put('', 'empty key');
      expect(cache.get('')).toBe('empty key');
    });

    it('should handle large values', () => {
      const largeValue = 'x'.repeat(1000000);
      cache.put('large', largeValue, 1000000);
      expect(cache.get('large')).toBe(largeValue);
    });
  });
});
