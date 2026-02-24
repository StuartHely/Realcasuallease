import { ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  list: ownerProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  getById: ownerProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const user = await db.getUserById(input.userId);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      
      const profile = await db.getCustomerProfileByUserId(input.userId);
      const bookings = await db.getBookingsByCustomerId(input.userId);
      
      return {
        user,
        profile,
        bookings,
      };
    }),

  updateInvoiceFlag: ownerProcedure
    .input(z.object({
      userId: z.number(),
      canPayByInvoice: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only mega_admin and owner_super_admin can modify invoice payment flag
      if (ctx.user.role !== "mega_admin" && ctx.user.role !== "owner_super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only SuperAdmin can modify invoice payment settings" });
      }
      await db.updateUserInvoiceFlag(input.userId, input.canPayByInvoice);
      return { success: true };
    }),
});
