import { ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const portfoliosRouter = router({
  list: ownerProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { portfolios, shoppingCentres } = await import("../../drizzle/schema");
    const { eq, sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: portfolios.id,
        ownerId: portfolios.ownerId,
        name: portfolios.name,
        bankBsb: portfolios.bankBsb,
        bankAccountNumber: portfolios.bankAccountNumber,
        bankAccountName: portfolios.bankAccountName,
        createdAt: portfolios.createdAt,
        centreCount: sql<number>`count(${shoppingCentres.id})::int`,
      })
      .from(portfolios)
      .leftJoin(shoppingCentres, eq(shoppingCentres.portfolioId, portfolios.id))
      .groupBy(portfolios.id)
      .orderBy(portfolios.name);

    return rows;
  }),

  listByOwner: ownerProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { portfolios } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.ownerId, input.ownerId))
        .orderBy(portfolios.name);
    }),

  create: adminProcedure
    .input(z.object({
      ownerId: z.number(),
      name: z.string().min(1).trim(),
      bankBsb: z.string().nullable().optional(),
      bankAccountNumber: z.string().nullable().optional(),
      bankAccountName: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { portfolios } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [result] = await db.insert(portfolios).values({
        ownerId: input.ownerId,
        name: input.name,
        bankBsb: input.bankBsb || null,
        bankAccountNumber: input.bankAccountNumber || null,
        bankAccountName: input.bankAccountName || null,
      }).returning({ id: portfolios.id });

      return { id: result.id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).trim().optional(),
      bankBsb: z.string().nullable().optional(),
      bankAccountNumber: z.string().nullable().optional(),
      bankAccountName: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { portfolios } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updates } = input;
      await db.update(portfolios).set(updates).where(eq(portfolios.id, id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { portfolios, shoppingCentres } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if any centres are assigned
      const centres = await db.select({ id: shoppingCentres.id }).from(shoppingCentres).where(eq(shoppingCentres.portfolioId, input.id));
      if (centres.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot delete portfolio — ${centres.length} centre(s) are still assigned to it` });
      }

      await db.delete(portfolios).where(eq(portfolios.id, input.id));
      return { success: true };
    }),
});
