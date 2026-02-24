import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const sitesRouter = router({
  getByCentreId: publicProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input }) => {
      return await db.getSitesByCentreId(input.centreId);
    }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const site = await db.getSiteById(input.id);
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      return site;
    }),
  
  checkAvailability: publicProcedure
    .input(z.object({
      siteId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const bookings = await db.getBookingsBySiteId(input.siteId, input.startDate, input.endDate);
      return {
        available: bookings.length === 0,
        bookings: bookings.map(b => ({
          id: b.id,
          startDate: b.startDate,
          endDate: b.endDate,
          status: b.status,
        })),
      };
    }),

  getApprovedCategories: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const { getApprovedCategoriesForSite } = await import("../usageCategoriesDb");
      return await getApprovedCategoriesForSite(input.siteId);
    }),

  setApprovedCategories: protectedProcedure
    .input(z.object({
      siteId: z.number(),
      categoryIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only owners and mega admins can manage site categories
      const allowedRoles = ['owner_super_admin', 'owner_state_admin', 'owner_regional_admin', 'owner_centre_manager', 'mega_admin', 'mega_state_admin'];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners and administrators can manage site categories' });
      }

      const { setApprovedCategoriesForSite } = await import("../usageCategoriesDb");
      await setApprovedCategoriesForSite(input.siteId, input.categoryIds);
      return { success: true };
    }),
});

export const usageTypesRouter = router({
  list: publicProcedure.query(async () => {
    return await db.getUsageTypes();
  }),
});
