import { eq, sql } from "drizzle-orm";
import { searchIntentCache } from "../drizzle/schema";
import type { LLMIntent } from "./intentParser";
import { createHash } from "crypto";

/**
 * Normalize a query for cache key generation.
 * Lowercases, trims, and collapses whitespace.
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Generate a SHA-256 hash of the normalized query for cache lookup.
 */
function hashQuery(query: string): string {
  return createHash("sha256").update(normalizeQuery(query)).digest("hex");
}

/**
 * Look up a cached LLM intent for the given query.
 * Returns the cached intent if found, null otherwise.
 * Increments hitCount and updates lastUsedAt on cache hit.
 */
export async function getCachedIntent(query: string): Promise<LLMIntent | null> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return null;

  const hash = hashQuery(query);

  try {
    const rows = await db
      .select()
      .from(searchIntentCache)
      .where(eq(searchIntentCache.queryHash, hash))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0]!;

    // Increment hit count and update last used time (fire-and-forget)
    db.update(searchIntentCache)
      .set({
        hitCount: sql`${searchIntentCache.hitCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(searchIntentCache.id, row.id))
      .catch(() => {});

    return row.parsedIntent as LLMIntent;
  } catch {
    return null;
  }
}

/**
 * Store a parsed LLM intent in the cache.
 */
export async function cacheIntent(query: string, intent: LLMIntent): Promise<void> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return;

  const hash = hashQuery(query);
  const normalized = normalizeQuery(query);

  try {
    await db
      .insert(searchIntentCache)
      .values({
        queryHash: hash,
        normalizedQuery: normalized,
        parsedIntent: intent,
      })
      .onConflictDoUpdate({
        target: searchIntentCache.queryHash,
        set: {
          hitCount: sql`${searchIntentCache.hitCount} + 1`,
          lastUsedAt: new Date(),
        },
      });
  } catch {
    // Non-fatal — caching is best-effort
  }
}
