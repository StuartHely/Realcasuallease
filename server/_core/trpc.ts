import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import type { User } from "../../drizzle/schema";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Resolve permitted centre and site IDs for a user based on role.
 * Returns null for IDs that should not be filtered (mega_admin sees all).
 */
async function resolvePermittedIds(user: User): Promise<{
  permittedCentreIds: number[] | null;
  permittedSiteIds: number[] | null;
}> {
  const role = user.role;

  // mega_admin: no filter needed — sees everything
  if (role === 'mega_admin') {
    return { permittedCentreIds: null, permittedSiteIds: null };
  }

  // Lazy-import to avoid circular dependency (db → schema → trpc)
  const { getDb } = await import("../db");
  const { shoppingCentres, sites } = await import("../../drizzle/schema");
  const { eq, and, inArray } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) return { permittedCentreIds: [], permittedSiteIds: [] };

  const conditions = [];

  // State filter for state admins
  if ((role === 'mega_state_admin' || role === 'owner_state_admin') && user.assignedState) {
    conditions.push(eq(shoppingCentres.state, user.assignedState));
  }

  // Owner filter for owner_* roles
  if (user.assignedOwnerId) {
    conditions.push(eq(shoppingCentres.ownerId, user.assignedOwnerId));
  }

  // owner_super_admin without owner assignment → no data (safety)
  if (role === 'owner_super_admin' && !user.assignedOwnerId) {
    return { permittedCentreIds: [], permittedSiteIds: [] };
  }

  let centreIds: number[];
  if (conditions.length > 0) {
    const centres = await db
      .select({ id: shoppingCentres.id })
      .from(shoppingCentres)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));
    centreIds = centres.map((c: any) => c.id);
  } else {
    // No conditions but not mega_admin — should not happen, but fallback to empty
    const allCentres = await db.select({ id: shoppingCentres.id }).from(shoppingCentres);
    centreIds = allCentres.map((c: any) => c.id);
  }

  if (centreIds.length === 0) {
    return { permittedCentreIds: [], permittedSiteIds: [] };
  }

  const filteredSites = await db
    .select({ id: sites.id })
    .from(sites)
    .where(inArray(sites.centreId, centreIds));

  return {
    permittedCentreIds: centreIds,
    permittedSiteIds: filteredSites.map((s: any) => s.id),
  };
}

/** Allows any non-customer role except owner_viewer (all owner_* roles + mega_state_admin + mega_admin) */
export const ownerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role === 'customer' || ctx.user.role === 'owner_viewer') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    // Resolve permitted centre/site IDs based on role, state, and owner
    const { permittedCentreIds, permittedSiteIds } = await resolvePermittedIds(ctx.user);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        permittedCentreIds,
        permittedSiteIds,
      },
    });
  }),
);

/** Requires mega_admin or mega_state_admin role */
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['mega_admin', 'mega_state_admin'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
