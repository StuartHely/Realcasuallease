import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const auditRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(500).default(100),
          offset: z.number().min(0).default(0),
          action: z.string().optional(),
          entityType: z.string().optional(),
          userId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { auditLog, users } = await import("../../drizzle/schema");
      const { desc, eq, and, sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const conditions = [];
      if (input?.action) conditions.push(eq(auditLog.action, input.action));
      if (input?.entityType)
        conditions.push(eq(auditLog.entityType, input.entityType));
      if (input?.userId) conditions.push(eq(auditLog.userId, input.userId));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, countResult] = await Promise.all([
        db
          .select({
            id: auditLog.id,
            userId: auditLog.userId,
            userName: users.name,
            userEmail: users.email,
            action: auditLog.action,
            entityType: auditLog.entityType,
            entityId: auditLog.entityId,
            changes: auditLog.changes,
            ipAddress: auditLog.ipAddress,
            createdAt: auditLog.createdAt,
          })
          .from(auditLog)
          .leftJoin(users, eq(auditLog.userId, users.id))
          .where(whereClause)
          .orderBy(desc(auditLog.createdAt))
          .limit(input?.limit ?? 100)
          .offset(input?.offset ?? 0),

        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLog)
          .where(whereClause),
      ]);

      return { logs, total: Number(countResult[0]?.count ?? 0) };
    }),
});
