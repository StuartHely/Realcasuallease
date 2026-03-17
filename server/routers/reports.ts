import { ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const reportsRouter = router({
  occupancy: ownerProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      centreId: z.number().optional(),
      portfolioId: z.number().optional(),
      assetTypes: z.array(z.enum(['cl', 'vs', 'tli'])).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const { getOccupancyReport } = await import('../occupancyReport');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      return await getOccupancyReport({
        startDate: input.startDate,
        endDate: input.endDate,
        centreId: input.centreId,
        portfolioId: input.portfolioId,
        assetTypes: input.assetTypes,
        scopedOwnerId,
      });
    }),

  agedDebtors: ownerProcedure
    .input(z.object({
      groupBy: z.enum(['customer', 'centre']),
    }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const { getAgedDebtorsReport } = await import('../agedDebtorsReport');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      return await getAgedDebtorsReport({
        groupBy: input.groupBy,
        scopedOwnerId,
      });
    }),

  gstSummary: ownerProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
      basis: z.enum(['cash', 'accrual', 'both']),
    }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const { getGstReport } = await import('../gstReport');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      return await getGstReport({
        month: input.month,
        year: input.year,
        basis: input.basis,
        scopedOwnerId,
      });
    }),

  weeklyReportDownload: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      weekCommencingDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { generateWeeklyBookingReport, formatWeeklyReportSubject, getWeeklyReportRecipients } = await import('../weeklyReport');
      const db = await import('../db');
      const centre = await db.getShoppingCentreById(input.centreId);
      if (!centre) throw new Error('Centre not found');

      const weekDate = new Date(input.weekCommencingDate + 'T00:00:00');
      const buffer = await generateWeeklyBookingReport(input.centreId, weekDate);
      const recipients = await getWeeklyReportRecipients(input.centreId);
      const subject = formatWeeklyReportSubject(centre.name, weekDate);

      // Convert buffer to base64 for transport over tRPC
      const uint8 = new Uint8Array(buffer as ArrayBuffer);
      const base64 = Buffer.from(uint8).toString('base64');

      return {
        base64,
        filename: `${subject}.xlsx`,
        recipients,
        centreName: centre.name,
      };
    }),
});
