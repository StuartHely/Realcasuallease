/**
 * In-memory search result cache with 5-minute TTL.
 * Reduces database load for repeated/similar search queries.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 200;

interface CacheEntry {
  result: any;
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Build a stable cache key from query + date */
export function buildCacheKey(query: string, date: Date): string {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${query.toLowerCase().trim()}|${dateStr}`;
}

/** Get a cached result if still valid */
export function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.result;
}

/** Store a result in the cache */
export function setCache(key: string, result: any): void {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    cache.forEach((v, k) => {
      if (v.createdAt < oldestTime) {
        oldestTime = v.createdAt;
        oldestKey = k;
      }
    });
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, { result, createdAt: Date.now() });
}

/** Invalidate all cached search results (e.g., after booking changes) */
export function clearSearchCache(): void {
  cache.clear();
}
