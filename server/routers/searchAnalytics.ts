import { ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const searchAnalyticsRouter = router({
  getSummary: ownerProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { getSearchAnalyticsSummary } = await import("../searchAnalyticsDb");
      return await getSearchAnalyticsSummary(input);
    }),

  getPopularSearches: ownerProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { getPopularSearches } = await import("../searchAnalyticsDb");
      return await getPopularSearches(input);
    }),

  getFailedSearches: ownerProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { getFailedSearches } = await import("../searchAnalyticsDb");
      return await getFailedSearches(input);
    }),

  getSuggestionClickThroughRate: ownerProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { getSuggestionClickThroughRate } = await import("../searchAnalyticsDb");
      return await getSuggestionClickThroughRate(input);
    }),
});
