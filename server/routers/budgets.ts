import { ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const budgetsRouter = router({
  list: ownerProcedure.query(async () => {
    return await db.getAllBudgets();
  }),

  create: ownerProcedure
    .input(z.object({
      siteId: z.number(),
      month: z.number().min(1).max(12),
      year: z.number(),
      budgetAmount: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await db.createBudget(input);
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      budgetAmount: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await db.updateBudget(input.id, input.budgetAmount);
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteBudget(input.id);
    }),

  getBySite: ownerProcedure
    .input(z.object({ siteId: z.number(), year: z.number() }))
    .query(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .query(async ({ input }) => {
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.getCentreBudgetsForYear(input.financialYear);
    }),

  saveCentreBudget: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      financialYear: z.number(),
      annualBudget: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.upsertCentreBudget(input);
    }),

  deleteCentreBudget: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const fyDb = await import("../fyBudgetDb");
      await fyDb.deleteCentreBudget(input.id);
      return { success: true };
    }),

  getAllCentresForBudget: ownerProcedure
    .query(async () => {
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.getAllCentresForBudget();
    }),

  getCentresWithoutBudget: ownerProcedure
    .input(z.object({ financialYear: z.number() }))
    .query(async ({ input }) => {
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.getCentresWithoutBudget(input.financialYear);
    }),

  bulkImportCentreBudgets: ownerProcedure
    .input(z.object({
      financialYear: z.number(),
      data: z.array(z.object({
        centreName: z.string(),
        annualBudget: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const fyDb = await import("../fyBudgetDb");
      return await fyDb.bulkImportCentreBudgets(input.financialYear, input.data);
    }),
});
