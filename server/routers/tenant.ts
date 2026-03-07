import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

const defaultBranding = {
  brandName: "Casual Lease",
  brandLogoUrl: null,
  brandPrimaryColor: "#123047",
  brandAccentColor: "#2e7d32",
  brandFaviconUrl: null,
  brandFooterText: null,
  supportEmail: null,
  supportPhone: null,
  isTenantSite: false,
};

export const tenantRouter = router({
  getBranding: publicProcedure.query(async ({ ctx }) => {
    const ownerId = ctx.tenantOwnerId;

    if (!ownerId) {
      return defaultBranding;
    }

    const owner = await db.getOwnerById(ownerId);
    if (!owner) {
      return defaultBranding;
    }

    return {
      brandName: owner.brandName || owner.name || "Casual Lease",
      brandLogoUrl: owner.brandLogoUrl || null,
      brandPrimaryColor: owner.brandPrimaryColor || "#123047",
      brandAccentColor: owner.brandAccentColor || "#2e7d32",
      brandFaviconUrl: owner.brandFaviconUrl || null,
      brandFooterText: owner.brandFooterText || null,
      supportEmail: owner.supportEmail || null,
      supportPhone: owner.supportPhone || null,
      isTenantSite: true,
    };
  }),

  // --- MegaAdmin Operator Management ---

  listOperators: adminProcedure.query(async () => {
    const owners = await db.getOwners();
    const { getDb } = await import("../db");
    const { tenantDomains } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const dbInstance = await getDb();
    if (!dbInstance) return owners.map(o => ({ ...o, domains: [] }));

    const results = [];
    for (const owner of owners) {
      const domains = await dbInstance
        .select()
        .from(tenantDomains)
        .where(eq(tenantDomains.ownerId, owner.id));
      results.push({ ...owner, domains });
    }
    return results;
  }),

  addDomain: adminProcedure
    .input(z.object({
      ownerId: z.number(),
      hostname: z.string().trim().toLowerCase().min(3),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("../db");
      const { tenantDomains } = await import("../../drizzle/schema");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // If setting as primary, unset any existing primary for this owner
      if (input.isPrimary) {
        const { eq, and } = await import("drizzle-orm");
        await dbInstance
          .update(tenantDomains)
          .set({ isPrimary: false })
          .where(and(eq(tenantDomains.ownerId, input.ownerId), eq(tenantDomains.isPrimary, true)));
      }

      await dbInstance.insert(tenantDomains).values({
        ownerId: input.ownerId,
        hostname: input.hostname,
        isPrimary: input.isPrimary,
      });

      const { invalidateTenantCache } = await import("../tenantResolver");
      invalidateTenantCache(input.ownerId);

      import("../auditHelper").then(m => m.writeAudit({
        userId: ctx.user.id,
        action: "tenant_domain_added",
        entityType: "tenant_domain",
        changes: { ownerId: input.ownerId, hostname: input.hostname },
      })).catch(() => {});

      return { success: true };
    }),

  removeDomain: adminProcedure
    .input(z.object({ domainId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("../db");
      const { tenantDomains } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [domain] = await dbInstance.select().from(tenantDomains).where(eq(tenantDomains.id, input.domainId));
      if (!domain) throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found" });

      await dbInstance.delete(tenantDomains).where(eq(tenantDomains.id, input.domainId));

      const { invalidateTenantCache } = await import("../tenantResolver");
      invalidateTenantCache(domain.ownerId);

      import("../auditHelper").then(m => m.writeAudit({
        userId: ctx.user.id,
        action: "tenant_domain_removed",
        entityType: "tenant_domain",
        entityId: input.domainId,
        changes: { hostname: domain.hostname, ownerId: domain.ownerId },
      })).catch(() => {});

      return { success: true };
    }),

  setPrimaryDomain: adminProcedure
    .input(z.object({ domainId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { tenantDomains } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [domain] = await dbInstance.select().from(tenantDomains).where(eq(tenantDomains.id, input.domainId));
      if (!domain) throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found" });

      // Unset all primary for this owner
      await dbInstance
        .update(tenantDomains)
        .set({ isPrimary: false })
        .where(and(eq(tenantDomains.ownerId, domain.ownerId), eq(tenantDomains.isPrimary, true)));

      // Set this one as primary
      await dbInstance
        .update(tenantDomains)
        .set({ isPrimary: true })
        .where(eq(tenantDomains.id, input.domainId));

      const { invalidateTenantCache } = await import("../tenantResolver");
      invalidateTenantCache(domain.ownerId);

      return { success: true };
    }),

  updateBranding: adminProcedure
    .input(z.object({
      ownerId: z.number(),
      brandName: z.string().trim().optional(),
      brandLogoUrl: z.string().nullable().optional(),
      brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
      brandAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
      brandFaviconUrl: z.string().nullable().optional(),
      brandFooterText: z.string().nullable().optional(),
      supportEmail: z.string().email().nullable().optional(),
      supportPhone: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { ownerId, ...updates } = input;
      await db.updateOwner(ownerId, updates);
      import("../auditHelper").then(m => m.writeAudit({
        userId: ctx.user.id,
        action: "tenant_branding_updated",
        entityType: "owner",
        entityId: input.ownerId,
        changes: updates,
      })).catch(() => {});
      return { success: true };
    }),
});
