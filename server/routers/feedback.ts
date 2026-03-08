import { publicProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const feedbackRouter = router({
  submit: publicProcedure
    .input(z.object({
      name: z.string().trim().max(255).optional(),
      email: z.string().email().max(320).optional(),
      category: z.enum(["general", "suggestion", "bug", "complaint"]).default("general"),
      message: z.string().trim().min(10).max(5000),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("../db");
      const { feedback } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.insert(feedback).values({
        name: input.name || null,
        email: input.email || null,
        category: input.category,
        message: input.message,
        userId: ctx.user?.id ?? null,
      });

      // Fire-and-forget email notification
      import("../_core/email").then(async ({ sendEmail }) => {
        const { ENV } = await import("../_core/env");
        if (!ENV.smtpFrom) return;
        const senderName = input.name || "Anonymous";
        const senderEmail = input.email || "Not provided";
        const now = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
        await sendEmail({
          to: ENV.smtpFrom,
          subject: `New Feedback: ${input.category} — ${senderName}`,
          html: `
            <h2>New Feedback Received</h2>
            <p><strong>Name:</strong> ${senderName}</p>
            <p><strong>Email:</strong> ${senderEmail}</p>
            <p><strong>Category:</strong> ${input.category}</p>
            <p><strong>Submitted:</strong> ${now}</p>
            <hr />
            <p>${input.message.replace(/\n/g, "<br />")}</p>
          `,
          text: `New Feedback: ${input.category}\nName: ${senderName}\nEmail: ${senderEmail}\nTime: ${now}\n\n${input.message}`,
        });
      }).catch(() => {});

      return { success: true };
    }),

  list: ownerProcedure
    .input(z.object({
      category: z.enum(["general", "suggestion", "bug", "complaint"]).optional(),
      isRead: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { feedback } = await import("../../drizzle/schema");
      const { desc, eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input?.category) conditions.push(eq(feedback.category, input.category));
      if (input?.isRead !== undefined) conditions.push(eq(feedback.isRead, input.isRead));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await db
        .select()
        .from(feedback)
        .where(whereClause)
        .orderBy(desc(feedback.createdAt));
    }),

  markRead: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { feedback } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(feedback).set({ isRead: true }).where(eq(feedback.id, input.id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { feedback } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(feedback).where(eq(feedback.id, input.id));
      return { success: true };
    }),
});
