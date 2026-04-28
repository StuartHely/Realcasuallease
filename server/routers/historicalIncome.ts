import { z } from "zod";
import { ownerProcedure, adminProcedure, router } from "../_core/trpc";
import * as hiDb from "../historicalIncomeDb";

const assetTypeEnum = z.enum(["casual_leasing", "vacant_shops", "third_line"]);

export const historicalIncomeRouter = router({
  list: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      assetType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await hiDb.getHistoricalIncome(input.centreId, input.assetType);
    }),

  upsert: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      assetType: assetTypeEnum,
      assetId: z.number().nullable().optional(),
      month: z.number().min(1).max(12),
      year: z.number(),
      amount: z.string(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      return await hiDb.upsertHistoricalIncome({
        ...input,
        assetId: input.assetId ?? null,
      });
    }),

  bulkImport: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      assetType: assetTypeEnum,
      rows: z.array(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        amount: z.string(),
        assetId: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return await hiDb.bulkImportHistoricalIncome(input.centreId, input.assetType, input.rows);
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await hiDb.deleteHistoricalIncome(input.id);
    }),

  deleteByScope: adminProcedure
    .input(z.object({
      centreId: z.number(),
      assetType: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await hiDb.deleteHistoricalIncomeByScope(input.centreId, input.assetType);
    }),

  getTotal: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      startMonth: z.number().min(1).max(12),
      startYear: z.number(),
      endMonth: z.number().min(1).max(12),
      endYear: z.number(),
      assetType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await hiDb.getHistoricalIncomeTotal(
        input.centreId, input.startMonth, input.startYear,
        input.endMonth, input.endYear, input.assetType,
      );
    }),
});
