import { publicProcedure, ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getAllUsageCategories, getApprovedCategoriesForSite, setApprovedCategoriesForSite, getSitesWithCategoriesForCentre } from "../usageCategoriesDb";

export const usageCategoriesRouter = router({
  list: publicProcedure.query(async () => {
    return await getAllUsageCategories();
  }),
  
  getApprovedForSite: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      return await getApprovedCategoriesForSite(input.siteId);
    }),
  
  getSitesWithCategories: ownerProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input }) => {
      return await getSitesWithCategoriesForCentre(input.centreId);
    }),
  
  setApprovedCategories: ownerProcedure
    .input(z.object({
      siteId: z.number(),
      categoryIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      await setApprovedCategoriesForSite(input.siteId, input.categoryIds);
      return { success: true };
    }),
  
  createCategory: ownerProcedure
    .input(z.object({
      name: z.string().min(1),
      isFree: z.boolean(),
      displayOrder: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const { createUsageCategory } = await import("../usageCategoriesDb");
      const categoryId = await createUsageCategory(input.name, input.isFree, input.displayOrder);
      return { success: true, categoryId };
    }),
  
  applyToAllSites: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      categoryIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const { applyApprovalsToAllSitesInCentre } = await import("../usageCategoriesDb");
      const sitesUpdated = await applyApprovalsToAllSitesInCentre(input.centreId, input.categoryIds);
      return { success: true, sitesUpdated };
    }),
  
  getUsageStats: ownerProcedure.query(async () => {
    const { getCategoryUsageStats } = await import("../usageCategoriesDb");
    return await getCategoryUsageStats();
  }),
});
