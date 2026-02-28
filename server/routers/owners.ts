import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const ownersRouter = router({
  list: adminProcedure.query(async () => {
    return await db.getOwners();
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getOwnerById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().trim().min(1),
      isAgency: z.boolean().default(false),
      parentAgencyId: z.number().nullable().optional(),
      companyAbn: z.string().trim().nullable(),
      contactName: z.string().trim().nullable(),
      contactTitle: z.string().trim().nullable(),
      address: z.string().trim().nullable(),
      email: z.string().nullable(),
      phone: z.string().trim().nullable(),
      secondaryContactName: z.string().trim().nullable(),
      secondaryContactTitle: z.string().trim().nullable(),
      secondaryAddress: z.string().trim().nullable(),
      secondaryEmail: z.string().nullable(),
      secondaryPhone: z.string().trim().nullable(),
      bankName: z.string().nullable(),
      bankAccountName: z.string().nullable(),
      bankBsb: z.string().nullable(),
      bankAccountNumber: z.string().nullable(),
      monthlyFee: z.string().default("0.00"),
      commissionPercentage: z.string().default("0.00"),
      remittanceType: z.enum(["per_booking", "monthly"]).default("monthly"),
      invoiceEmail1: z.string().nullable(),
      invoiceEmail2: z.string().nullable(),
      invoiceEmail3: z.string().nullable(),
      remittanceEmail1: z.string().nullable(),
      remittanceEmail2: z.string().nullable(),
      remittanceEmail3: z.string().nullable(),
      remittanceEmail4: z.string().nullable(),
      remittanceEmail5: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      await db.createOwner(input);
      return { success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().trim().min(1),
      isAgency: z.boolean().optional(),
      parentAgencyId: z.number().nullable().optional(),
      companyAbn: z.string().trim().nullable(),
      contactName: z.string().trim().nullable(),
      contactTitle: z.string().trim().nullable(),
      address: z.string().trim().nullable(),
      email: z.string().nullable(),
      phone: z.string().trim().nullable(),
      secondaryContactName: z.string().trim().nullable(),
      secondaryContactTitle: z.string().trim().nullable(),
      secondaryAddress: z.string().trim().nullable(),
      secondaryEmail: z.string().nullable(),
      secondaryPhone: z.string().trim().nullable(),
      bankName: z.string().nullable(),
      bankAccountName: z.string().nullable(),
      bankBsb: z.string().nullable(),
      bankAccountNumber: z.string().nullable(),
      monthlyFee: z.string().default("0.00"),
      commissionPercentage: z.string().default("0.00"),
      remittanceType: z.enum(["per_booking", "monthly"]).default("monthly"),
      invoiceEmail1: z.string().nullable(),
      invoiceEmail2: z.string().nullable(),
      invoiceEmail3: z.string().nullable(),
      remittanceEmail1: z.string().nullable(),
      remittanceEmail2: z.string().nullable(),
      remittanceEmail3: z.string().nullable(),
      remittanceEmail4: z.string().nullable(),
      remittanceEmail5: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOwner(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteOwner(input.id);
      return { success: true };
    }),
});
