import { publicProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getAllUsageCategories, getApprovedCategoriesForSite, setApprovedCategoriesForSite, getSitesWithCategoriesForCentre } from "../usageCategoriesDb";

export const usageCategoriesRouter = router({
  list: publicProcedure.query(async () => {
    return await getAllUsageCategories();
  }),
  
  listAll: adminProcedure.query(async () => {
    const { getAllUsageCategoriesIncludingInactive } = await import("../usageCategoriesDb");
    return await getAllUsageCategoriesIncludingInactive();
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
  
  updateCategory: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      isFree: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const { updateUsageCategory } = await import("../usageCategoriesDb");
      await updateUsageCategory(id, data);
      return { success: true };
    }),
  
  deleteCategory: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { deleteUsageCategory } = await import("../usageCategoriesDb");
      await deleteUsageCategory(input.id);
      return { success: true };
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
