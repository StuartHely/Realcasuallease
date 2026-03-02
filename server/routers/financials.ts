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
      const { sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return null;

      // Build WHERE fragments for each booking table
      const clConditions: string[] = [`b.status = 'confirmed'`];
      const vsConditions: string[] = [`b.status = 'confirmed'`];
      const tlConditions: string[] = [`b.status = 'confirmed'`];

      if (input?.startDate) {
        const d = input.startDate;
        clConditions.push(`b."createdAt" >= '${d}'`);
        vsConditions.push(`b."createdAt" >= '${d}'`);
        tlConditions.push(`b."createdAt" >= '${d}'`);
      }
      if (input?.endDate) {
        const d = input.endDate + "T23:59:59";
        clConditions.push(`b."createdAt" <= '${d}'`);
        vsConditions.push(`b."createdAt" <= '${d}'`);
        tlConditions.push(`b."createdAt" <= '${d}'`);
      }
      if (input?.centreId) {
        clConditions.push(`s."centreId" = ${input.centreId}`);
        vsConditions.push(`a."centreId" = ${input.centreId}`);
        tlConditions.push(`a."centreId" = ${input.centreId}`);
      }
      if (input?.ownerId) {
        clConditions.push(`c."ownerId" = ${input.ownerId}`);
        vsConditions.push(`c."ownerId" = ${input.ownerId}`);
        tlConditions.push(`c."ownerId" = ${input.ownerId}`);
      }

      const clWhere = clConditions.join(" AND ");
      const vsWhere = vsConditions.join(" AND ");
      const tlWhere = tlConditions.join(" AND ");

      // Unified booking view across all 3 booking tables
      const unionQuery = `
        SELECT b."totalAmount", b."gstAmount", b."ownerAmount", b."platformFee",
               b."paidAt", b."paymentMethod", b."createdAt",
               s."centreId" AS "centreId", c.name AS "centreName", c.state AS state
        FROM bookings b
        LEFT JOIN sites s ON b."siteId" = s.id
        LEFT JOIN shopping_centres c ON s."centreId" = c.id
        WHERE ${clWhere}

        UNION ALL

        SELECT b."totalAmount", b."gstAmount", b."ownerAmount", b."platformFee",
               b."paidAt", b."paymentMethod", b."createdAt",
               a."centreId" AS "centreId", c.name AS "centreName", c.state AS state
        FROM vacant_shop_bookings b
        LEFT JOIN vacant_shops a ON b."vacantShopId" = a.id
        LEFT JOIN shopping_centres c ON a."centreId" = c.id
        WHERE ${vsWhere}

        UNION ALL

        SELECT b."totalAmount", b."gstAmount", b."ownerAmount", b."platformFee",
               b."paidAt", b."paymentMethod", b."createdAt",
               a."centreId" AS "centreId", c.name AS "centreName", c.state AS state
        FROM third_line_bookings b
        LEFT JOIN third_line_income a ON b."thirdLineIncomeId" = a.id
        LEFT JOIN shopping_centres c ON a."centreId" = c.id
        WHERE ${tlWhere}
      `;

      // Summary totals
      const totalsResult = await db.execute(sql.raw(`
        SELECT
          COALESCE(SUM(CAST(u."totalAmount" AS DECIMAL)), 0) AS "totalRevenue",
          COALESCE(SUM(CAST(u."gstAmount" AS DECIMAL)), 0) AS "totalGst",
          COALESCE(SUM(CAST(u."ownerAmount" AS DECIMAL)), 0) AS "totalOwnerAmount",
          COALESCE(SUM(CAST(u."platformFee" AS DECIMAL)), 0) AS "totalPlatformFee",
          COUNT(*) AS "bookingCount",
          SUM(CASE WHEN u."paidAt" IS NOT NULL THEN 1 ELSE 0 END) AS "paidCount"
        FROM (${unionQuery}) u
      `));
      const totals = totalsResult.rows[0] as any;

      // Revenue by centre
      const revenueByCentreResult = await db.execute(sql.raw(`
        SELECT
          u."centreId",
          u."centreName",
          u.state,
          COALESCE(SUM(CAST(u."totalAmount" AS DECIMAL)), 0) AS "totalRevenue",
          COALESCE(SUM(CAST(u."gstAmount" AS DECIMAL)), 0) AS "totalGst",
          COALESCE(SUM(CAST(u."platformFee" AS DECIMAL)), 0) AS "platformFee",
          COALESCE(SUM(CAST(u."ownerAmount" AS DECIMAL)), 0) AS "ownerAmount",
          COUNT(*) AS "bookingCount"
        FROM (${unionQuery}) u
        GROUP BY u."centreId", u."centreName", u.state
        ORDER BY SUM(CAST(u."totalAmount" AS DECIMAL)) DESC
      `));
      const revenueByCentre = revenueByCentreResult.rows as any[];

      // Revenue by month
      const revenueByMonthResult = await db.execute(sql.raw(`
        SELECT
          TO_CHAR(u."createdAt", 'YYYY-MM') AS month,
          COALESCE(SUM(CAST(u."totalAmount" AS DECIMAL)), 0) AS "totalRevenue",
          COALESCE(SUM(CAST(u."platformFee" AS DECIMAL)), 0) AS "platformFee",
          COUNT(*) AS "bookingCount"
        FROM (${unionQuery}) u
        GROUP BY TO_CHAR(u."createdAt", 'YYYY-MM')
        ORDER BY TO_CHAR(u."createdAt", 'YYYY-MM')
      `));
      const revenueByMonth = revenueByMonthResult.rows as any[];

      // Payment method breakdown
      const paymentBreakdownResult = await db.execute(sql.raw(`
        SELECT
          u."paymentMethod",
          COUNT(*) AS count,
          COALESCE(SUM(CAST(u."totalAmount" AS DECIMAL)), 0) AS total
        FROM (${unionQuery}) u
        GROUP BY u."paymentMethod"
      `));
      const paymentBreakdown = paymentBreakdownResult.rows as any[];

      return {
        totals,
        revenueByCentre,
        revenueByMonth,
        paymentBreakdown,
      };
    }),
});
