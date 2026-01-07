/**
 * Simple in-memory cache with TTL support
 * For production, consider using Redis or similar
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in the cache with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[Cache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Export singleton instance
export const cache = new SimpleCache();

/**
 * Generate a cache key for search results
 */
export function getSearchCacheKey(query: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `search:${query.toLowerCase().trim()}:${dateStr}`;
}

/**
 * Invalidate all search-related cache entries
 * Call this when bookings are created/updated/cancelled
 */
export function invalidateSearchCache(): void {
  const keys = Array.from(cache.getStats().keys);
  const searchKeys = keys.filter(k => k.startsWith('search:'));
  
  for (const key of searchKeys) {
    cache.delete(key);
  }
  
  console.log(`[Cache] Invalidated ${searchKeys.length} search cache entries`);
}
