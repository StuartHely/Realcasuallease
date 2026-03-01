import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const financialsRouter = router({
  summary: adminProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          centreId: z.number().optional(),
          ownerId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { bookings, shoppingCentres, sites } = await import(
        "../../drizzle/schema"
      );
      const { sql, eq, and, gte, lte, desc } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return null;

      const conditions: ReturnType<typeof eq>[] = [
        eq(bookings.status, "confirmed"),
      ];
      if (input?.startDate)
        conditions.push(gte(bookings.createdAt, new Date(input.startDate)));
      if (input?.endDate)
        conditions.push(
          lte(bookings.createdAt, new Date(input.endDate + "T23:59:59")),
        );
      if (input?.centreId)
        conditions.push(eq(sites.centreId, input.centreId));
      if (input?.ownerId)
        conditions.push(eq(shoppingCentres.ownerId, input.ownerId));

      const needsJoin = !!(input?.centreId || input?.ownerId);

      const whereClause = and(...conditions);

      // Summary totals
      const totalsQuery = db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
          totalGst: sql<string>`COALESCE(SUM(CAST(${bookings.gstAmount} AS DECIMAL)), 0)`,
          totalOwnerAmount: sql<string>`COALESCE(SUM(CAST(${bookings.ownerAmount} AS DECIMAL)), 0)`,
          totalPlatformFee: sql<string>`COALESCE(SUM(CAST(${bookings.platformFee} AS DECIMAL)), 0)`,
          bookingCount: sql<number>`COUNT(*)`,
          paidCount: sql<number>`SUM(CASE WHEN ${bookings.paidAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        })
        .from(bookings);

      if (needsJoin) {
        totalsQuery
          .leftJoin(sites, eq(bookings.siteId, sites.id))
          .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id));
      }

      const [totals] = await totalsQuery.where(whereClause);

      // Revenue by centre (always needs joins)
      const revenueByCentre = await db
        .select({
          centreId: sites.centreId,
          centreName: shoppingCentres.name,
          state: shoppingCentres.state,
          totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
          totalGst: sql<string>`COALESCE(SUM(CAST(${bookings.gstAmount} AS DECIMAL)), 0)`,
          platformFee: sql<string>`COALESCE(SUM(CAST(${bookings.platformFee} AS DECIMAL)), 0)`,
          ownerAmount: sql<string>`COALESCE(SUM(CAST(${bookings.ownerAmount} AS DECIMAL)), 0)`,
          bookingCount: sql<number>`COUNT(*)`,
        })
        .from(bookings)
        .leftJoin(sites, eq(bookings.siteId, sites.id))
        .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
        .where(whereClause)
        .groupBy(sites.centreId, shoppingCentres.name, shoppingCentres.state)
        .orderBy(
          desc(sql`SUM(CAST(${bookings.totalAmount} AS DECIMAL))`),
        );

      // Revenue by month
      const revenueByMonthQuery = db
        .select({
          month: sql<string>`TO_CHAR(${bookings.createdAt}, 'YYYY-MM')`,
          totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
          platformFee: sql<string>`COALESCE(SUM(CAST(${bookings.platformFee} AS DECIMAL)), 0)`,
          bookingCount: sql<number>`COUNT(*)`,
        })
        .from(bookings);

      if (needsJoin) {
        revenueByMonthQuery
          .leftJoin(sites, eq(bookings.siteId, sites.id))
          .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id));
      }

      const revenueByMonth = await revenueByMonthQuery
        .where(whereClause)
        .groupBy(sql`TO_CHAR(${bookings.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${bookings.createdAt}, 'YYYY-MM')`);

      // Payment method breakdown
      const paymentBreakdownQuery = db
        .select({
          paymentMethod: bookings.paymentMethod,
          count: sql<number>`COUNT(*)`,
          total: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
        })
        .from(bookings);

      if (needsJoin) {
        paymentBreakdownQuery
          .leftJoin(sites, eq(bookings.siteId, sites.id))
          .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id));
      }

      const paymentBreakdown = await paymentBreakdownQuery
        .where(whereClause)
        .groupBy(bookings.paymentMethod);

      return {
        totals,
        revenueByCentre,
        revenueByMonth,
        paymentBreakdown,
      };
    }),
});
