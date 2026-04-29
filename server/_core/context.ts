import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { authService } from "./authService";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantOwnerId: number | null;
  /** Populated by ownerProcedure — null means "all" (no filter needed, e.g. mega_admin) */
  permittedCentreIds: number[] | null;
  /** Populated by ownerProcedure — null means "all" (no filter needed, e.g. mega_admin) */
  permittedSiteIds: number[] | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Try username/password auth first (new auth system)
  try {
    user = await authService.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // Fall back to JWT session auth if no user found
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      user = null;
    }
  }

  // Sliding window: re-issue the session cookie on every authenticated
  // request so the 24-hour expiry resets from "now", not from login time.
  if (user) {
    try {
      const freshToken = await authService.createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(opts.req);
      opts.res.cookie(COOKIE_NAME, freshToken, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });
    } catch {
      // Non-fatal — user stays authenticated with the current token
    }
  }

  // Extract tenant owner ID set by tenantMiddleware
  const tenantOwnerId: number | null = (opts.req as any).tenantOwnerId ?? null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantOwnerId,
    permittedCentreIds: null,
    permittedSiteIds: null,
  };
}
