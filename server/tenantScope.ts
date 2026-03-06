import { eq } from "drizzle-orm";
import { shoppingCentres } from "../drizzle/schema";
import type { User } from "../drizzle/schema";

/**
 * Apply an owner-scope filter to any Drizzle query that involves the
 * shoppingCentres table.  If ownerId is null/undefined the query is
 * returned unmodified (backward-compatible — no tenant filtering).
 *
 * Usage:
 *   const q = db.select().from(shoppingCentres);
 *   const rows = await withOwnerScope(q, tenantOwnerId);
 */
export function withOwnerScope<T extends { where: (...args: any[]) => T }>(
  query: T,
  ownerId?: number | null,
): T {
  if (ownerId == null) return query;
  return query.where(eq(shoppingCentres.ownerId, ownerId));
}

/**
 * Determine the effective ownerId for admin-side queries.
 *
 * - MegaAdmin / mega_state_admin → null (sees everything, or everything in their state)
 * - Owner-role users → their assignedOwnerId
 *
 * This is the single source of truth for "which owner's data should this
 * admin user see?"
 */
export function getScopedOwnerId(user: User | null): number | null {
  if (!user) return null;
  if (user.role === "mega_admin" || user.role === "mega_state_admin") return null;
  return user.assignedOwnerId ?? null;
}

/**
 * Get the primary hostname for an owner (for generating email links).
 * Falls back to APP_URL env var if no domain is configured.
 */
export async function getOperatorAppUrl(ownerId: number): Promise<string> {
  const { getDb } = await import("./db");
  const { tenantDomains } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) return process.env.APP_URL || "http://localhost:5173";

  // Look for primary domain first, then any active domain
  const [primary] = await db
    .select({ hostname: tenantDomains.hostname })
    .from(tenantDomains)
    .where(
      and(
        eq(tenantDomains.ownerId, ownerId),
        eq(tenantDomains.isActive, true),
        eq(tenantDomains.isPrimary, true),
      ),
    )
    .limit(1);

  if (primary) return `https://${primary.hostname}`;

  const [any] = await db
    .select({ hostname: tenantDomains.hostname })
    .from(tenantDomains)
    .where(
      and(
        eq(tenantDomains.ownerId, ownerId),
        eq(tenantDomains.isActive, true),
      ),
    )
    .limit(1);

  if (any) return `https://${any.hostname}`;

  return process.env.APP_URL || "http://localhost:5173";
}
