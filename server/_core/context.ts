import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authService } from "./authService";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantOwnerId: number | null;
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

  // Extract tenant owner ID set by tenantMiddleware
  const tenantOwnerId: number | null = (opts.req as any).tenantOwnerId ?? null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantOwnerId,
  };
}
