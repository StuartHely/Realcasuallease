import { publicProcedure, ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const faqsRouter = router({
  // Public endpoint - get all active FAQs ordered by displayOrder
  list: publicProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { faqs } = await import("../../drizzle/schema");
    const { eq, asc } = await import("drizzle-orm");
    
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    return await db
      .select()
      .from(faqs)
      .where(eq(faqs.isActive, true))
      .orderBy(asc(faqs.displayOrder));
  }),

  // Admin: Get all FAQs (including inactive)
  listAll: ownerProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { faqs } = await import("../../drizzle/schema");
    const { asc } = await import("drizzle-orm");
    
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    return await db
      .select()
      .from(faqs)
      .orderBy(asc(faqs.displayOrder));
  }),

  // Admin: Create new FAQ
  create: ownerProcedure
    .input(z.object({
      question: z.string().min(1).max(500),
      answer: z.string().min(1),
      displayOrder: z.number().int().default(0),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { faqs } = await import("../../drizzle/schema");
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const result = await db.insert(faqs).values({
        question: input.question,
        answer: input.answer,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
      }).returning();

      return { success: true, faq: result[0] };
    }),

  // Admin: Update FAQ
  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      question: z.string().min(1).max(500).optional(),
      answer: z.string().min(1).optional(),
      displayOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { faqs } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const { id, ...updates } = input;

      await db
        .update(faqs)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(faqs.id, id));

      return { success: true };
    }),

  // Admin: Delete FAQ
  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { faqs } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      await db.delete(faqs).where(eq(faqs.id, input.id));

      return { success: true };
    }),

  // Admin: Reorder FAQs
  reorder: ownerProcedure
    .input(z.object({
      faqIds: z.array(z.number()), // Array of FAQ IDs in desired order
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { faqs } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Update display order for each FAQ
      for (let i = 0; i < input.faqIds.length; i++) {
        await db
          .update(faqs)
          .set({ displayOrder: i, updatedAt: new Date() })
          .where(eq(faqs.id, input.faqIds[i]));
      }

      return { success: true };
    }),
});
