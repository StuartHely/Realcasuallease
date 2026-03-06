import type { Request, Response, NextFunction } from "express";
import { getDb } from "./db";
import { tenantDomains } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// In-memory cache: hostname → ownerId (5-minute TTL)
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { ownerId: number | null; expiresAt: number }>();

/**
 * Resolve an ownerId from a hostname via the tenant_domains table.
 * Returns null if no active mapping exists.
 */
export async function resolveOwnerIdFromHostname(hostname: string): Promise<number | null> {
  // Normalise: lowercase, strip port
  const normalised = hostname.toLowerCase().split(":")[0];

  // Check cache
  const cached = cache.get(normalised);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ownerId;
  }

  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select({ ownerId: tenantDomains.ownerId })
    .from(tenantDomains)
    .where(and(eq(tenantDomains.hostname, normalised), eq(tenantDomains.isActive, true)))
    .limit(1);

  const ownerId = row?.ownerId ?? null;

  cache.set(normalised, { ownerId, expiresAt: Date.now() + CACHE_TTL_MS });
  return ownerId;
}

/**
 * Invalidate cached entries for a specific owner (call after domain CRUD).
 */
export function invalidateTenantCache(ownerId?: number): void {
  if (!ownerId) {
    cache.clear();
    return;
  }
  cache.forEach((entry, hostname) => {
    if (entry.ownerId === ownerId) cache.delete(hostname);
  });
}

/**
 * Express middleware: resolves the tenant from the request hostname
 * and attaches `tenantOwnerId` to the request object.
 *
 * In development (localhost), falls back to DEFAULT_TENANT_OWNER_ID env var
 * or null (no filtering — current behaviour preserved).
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const hostname = req.hostname || req.headers.host || "";
  const normalised = hostname.toLowerCase().split(":")[0];

  // Localhost / dev: skip tenant resolution, use env default or null
  if (normalised === "localhost" || normalised === "127.0.0.1") {
    const defaultId = process.env.DEFAULT_TENANT_OWNER_ID;
    (req as any).tenantOwnerId = defaultId ? parseInt(defaultId) : null;
    next();
    return;
  }

  resolveOwnerIdFromHostname(normalised)
    .then((ownerId) => {
      (req as any).tenantOwnerId = ownerId;
      next();
    })
    .catch((err) => {
      console.error("[TenantResolver] Error:", err);
      (req as any).tenantOwnerId = null;
      next();
    });
}

/**
 * Helper: extract tenantOwnerId from a request (for use outside middleware chain).
 */
export function getTenantOwnerId(req: Request): number | null {
  return (req as any).tenantOwnerId ?? null;
}
