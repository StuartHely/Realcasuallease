import { ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const budgetsRouter = router({
  list: ownerProcedure.query(async ({ ctx }) => {
    const { getScopedOwnerId } = await import('../tenantScope');
    const scopedOwnerId = getScopedOwnerId(ctx.user);
    const allBudgets = await db.getAllBudgets();
    if (!scopedOwnerId) return allBudgets;
    const centres = await db.getShoppingCentres(scopedOwnerId);
    const centreNames = new Set(centres.map(c => c.name));
    return allBudgets.filter((b: any) => b.centreName && centreNames.has(b.centreName));
  }),

  create: ownerProcedure
    .input(z.object({
      siteId: z.number(),
      month: z.number().min(1).max(12),
      year: z.number(),
      budgetAmount: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const site = await db.getSiteById(input.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        const centre = await db.getShoppingCentreById(site.centreId);
        if (!centre || centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      return await db.createBudget(input);
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      budgetAmount: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const allBudgets = await db.getAllBudgets();
        const budget = allBudgets.find((b: any) => b.id === input.id);
        if (!budget) throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
        const site = await db.getSiteById(budget.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        const centre = await db.getShoppingCentreById(site.centreId);
        if (!centre || centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      return await db.updateBudget(input.id, input.budgetAmount);
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const allBudgets = await db.getAllBudgets();
        const budget = allBudgets.find((b: any) => b.id === input.id);
        if (!budget) throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
        const site = await db.getSiteById(budget.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        const centre = await db.getShoppingCentreById(site.centreId);
        if (!centre || centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      return await db.deleteBudget(input.id);
    }),

  getBySite: ownerProcedure
    .input(z.object({ siteId: z.number(), year: z.number() }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const site = await db.getSiteById(input.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        const centre = await db.getShoppingCentreById(site.centreId);
        if (!centre || centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      return await db.getBudgetsBySite(input.siteId, input.year);
    }),

  bulkImport: ownerProcedure
    .input(z.object({
      budgets: z.array(z.object({
        siteId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
        budgetAmount: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const siteIds = Array.from(new Set(input.budgets.map(b => b.siteId)));
        for (const siteId of siteIds) {
          const site = await db.getSiteById(siteId);
          if (!site) throw new TRPCError({ code: "NOT_FOUND", message: `Site ${siteId} not found` });
          const centre = await db.getShoppingCentreById(site.centreId);
          if (!centre || centre.ownerId !== scopedOwnerId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }
      }
      return await db.bulkImportBudgets(input.budgets);
    }),

  // Financial Year Budget Management
  getFyPercentages: ownerProcedure
    .input(z.object({ financialYear: z.number() }))
    .query(async ({ input }) => {
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.getFyPercentages(input.financialYear);
    }),

  saveFyPercentages: ownerProcedure
    .input(z.object({
      financialYear: z.number(),
      july: z.string(),
      august: z.string(),
      september: z.string(),
      october: z.string(),
      november: z.string(),
      december: z.string(),
      january: z.string(),
      february: z.string(),
      march: z.string(),
      april: z.string(),
      may: z.string(),
      june: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.upsertFyPercentages(input);
    }),

  getCentreBudgetsForYear: ownerProcedure
    .input(z.object({ financialYear: z.number() }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      const fyDb = await import("../fyBudgetDb");
      const allBudgets = await fyDb.getCentreBudgetsForYear(input.financialYear);
      if (!scopedOwnerId) return allBudgets;
      const centres = await db.getShoppingCentres(scopedOwnerId);
      const centreIds = new Set(centres.map(c => c.id));
      return allBudgets.filter((b: any) => centreIds.has(b.centreId));
    }),

  saveCentreBudget: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      financialYear: z.number(),
      annualBudget: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const centre = await db.getShoppingCentreById(input.centreId);
        if (!centre || centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.upsertCentreBudget(input);
    }),

  deleteCentreBudget: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const { getDb: getDbFn } = await import("../db");
        const { centreBudgets } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await getDbFn();
        if (dbInstance) {
          const [budget] = await dbInstance.select().from(centreBudgets).where(eq(centreBudgets.id, input.id)).limit(1);
          if (budget) {
            const centre = await db.getShoppingCentreById(budget.centreId);
            if (!centre || centre.ownerId !== scopedOwnerId) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
            }
          }
        }
      }
      const fyDb = await import("../fyBudgetDb");
      await fyDb.deleteCentreBudget(input.id);
      return { success: true };
    }),

  getAllCentresForBudget: ownerProcedure
    .query(async ({ ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        const centres = await db.getShoppingCentres(scopedOwnerId);
        return centres.map(c => ({ id: c.id, name: c.name, state: c.state }));
      }
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.getAllCentresForBudget();
    }),

  getCentresWithoutBudget: ownerProcedure
    .input(z.object({ financialYear: z.number() }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      const fyDb = await import("../fyBudgetDb");
      const centresWithout = await fyDb.getCentresWithoutBudget(input.financialYear);
      if (!scopedOwnerId) return centresWithout;
      const centres = await db.getShoppingCentres(scopedOwnerId);
      const centreIds = new Set(centres.map(c => c.id));
      return centresWithout.filter((c: any) => centreIds.has(c.id));
    }),

  bulkImportCentreBudgets: ownerProcedure
    .input(z.object({
      financialYear: z.number(),
      data: z.array(z.object({
        centreName: z.string(),
        annualBudget: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      if (scopedOwnerId) {
        // Verify all centre names map to centres the user owns
        const centres = await db.getShoppingCentres(scopedOwnerId);
        const ownedNames = new Set(centres.map(c => c.name.toLowerCase().trim()));
        for (const row of input.data) {
          if (!ownedNames.has(row.centreName.toLowerCase().trim())) {
            throw new TRPCError({ code: "FORBIDDEN", message: `Access denied for centre: ${row.centreName}` });
          }
        }
      }
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.bulkImportCentreBudgets(input.financialYear, input.data);
    }),
});
