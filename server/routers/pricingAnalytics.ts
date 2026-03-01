import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const pricingAnalyticsRouter = router({
  getSiteAnalytics: adminProcedure
    .input(z.object({
      centreId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { bookings, sites, shoppingCentres } = await import("../../drizzle/schema");
      const { sql, eq, and, gte, lte, desc } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return { sites: [], summary: null };

      const now = new Date();
      const defaultStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const startDate = input?.startDate ? new Date(input.startDate) : defaultStart;
      const endDate = input?.endDate ? new Date(input.endDate + "T23:59:59") : now;
      const totalDaysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const conditions: any[] = [];
      if (input?.centreId) conditions.push(eq(sites.centreId, input.centreId));

      const siteAnalytics = await db.select({
        siteId: sites.id,
        siteNumber: sites.siteNumber,
        centreId: sites.centreId,
        centreName: shoppingCentres.name,
        state: shoppingCentres.state,
        pricePerDay: sites.pricePerDay,
        weekendPricePerDay: sites.weekendPricePerDay,
        pricePerWeek: sites.pricePerWeek,
        bookingCount: sql<number>`COUNT(${bookings.id})`,
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
        totalDaysBooked: sql<number>`COALESCE(SUM(
          GREATEST(0, 
            EXTRACT(EPOCH FROM (LEAST(${bookings.endDate}, ${endDate}::timestamp) - GREATEST(${bookings.startDate}, ${startDate}::timestamp))) / 86400 + 1
          )
        ), 0)`,
        avgBookingValue: sql<string>`COALESCE(AVG(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
        avgBookingDuration: sql<number>`COALESCE(AVG(
          EXTRACT(EPOCH FROM (${bookings.endDate} - ${bookings.startDate})) / 86400 + 1
        ), 0)`,
      })
      .from(sites)
      .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
      .leftJoin(bookings, and(
        eq(bookings.siteId, sites.id),
        eq(bookings.status, "confirmed"),
        gte(bookings.startDate, startDate),
        lte(bookings.endDate, endDate),
      ))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sites.id, sites.siteNumber, sites.centreId, shoppingCentres.name, shoppingCentres.state, sites.pricePerDay, sites.weekendPricePerDay, sites.pricePerWeek)
      .orderBy(desc(sql`COUNT(${bookings.id})`));

      const enrichedSites = siteAnalytics.map(site => ({
        ...site,
        totalRevenue: Number(site.totalRevenue),
        avgBookingValue: Number(site.avgBookingValue),
        occupancyRate: totalDaysInRange > 0 ? Math.min(100, (Number(site.totalDaysBooked) / totalDaysInRange) * 100) : 0,
      }));

      const totalSites = enrichedSites.length;
      const totalBookings = enrichedSites.reduce((sum, s) => sum + Number(s.bookingCount), 0);
      const totalRevenue = enrichedSites.reduce((sum, s) => sum + s.totalRevenue, 0);
      const avgOccupancy = totalSites > 0 ? enrichedSites.reduce((sum, s) => sum + s.occupancyRate, 0) / totalSites : 0;

      return {
        sites: enrichedSites,
        summary: {
          totalSites,
          totalBookings,
          totalRevenue,
          avgOccupancy,
          dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
          totalDaysInRange,
        },
      };
    }),

  getRecommendations: adminProcedure
    .input(z.object({
      centreId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { bookings, sites, shoppingCentres } = await import("../../drizzle/schema");
      const { sql, eq, and, gte } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return [];

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const conditions: any[] = [];
      if (input?.centreId) conditions.push(eq(sites.centreId, input.centreId));

      const siteData = await db.select({
        siteId: sites.id,
        siteNumber: sites.siteNumber,
        centreName: shoppingCentres.name,
        pricePerDay: sites.pricePerDay,
        weekendPricePerDay: sites.weekendPricePerDay,
        bookingCount: sql<number>`COUNT(${bookings.id})`,
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
        totalDaysBooked: sql<number>`COALESCE(SUM(
          EXTRACT(EPOCH FROM (${bookings.endDate} - ${bookings.startDate})) / 86400 + 1
        ), 0)`,
      })
      .from(sites)
      .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
      .leftJoin(bookings, and(
        eq(bookings.siteId, sites.id),
        eq(bookings.status, "confirmed"),
        gte(bookings.startDate, ninetyDaysAgo),
      ))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sites.id, sites.siteNumber, shoppingCentres.name, sites.pricePerDay, sites.weekendPricePerDay);

      const recommendations = siteData.map(site => {
        const occupancy = 90 > 0 ? (Number(site.totalDaysBooked) / 90) * 100 : 0;
        const currentRate = Number(site.pricePerDay);
        let suggestedRate = currentRate;
        let action: "increase" | "decrease" | "maintain" = "maintain";
        let reasoning = "";

        if (occupancy > 80) {
          const increase = Math.min(20, Math.round(occupancy - 70) / 2);
          suggestedRate = Math.round(currentRate * (1 + increase / 100) * 100) / 100;
          action = "increase";
          reasoning = `High occupancy (${occupancy.toFixed(1)}%) indicates strong demand. Consider a ${increase}% rate increase.`;
        } else if (occupancy < 30 && Number(site.bookingCount) > 0) {
          const decrease = Math.min(15, Math.round(30 - occupancy) / 2);
          suggestedRate = Math.round(currentRate * (1 - decrease / 100) * 100) / 100;
          action = "decrease";
          reasoning = `Low occupancy (${occupancy.toFixed(1)}%) suggests the site may be overpriced. Consider a ${decrease}% rate reduction to attract more bookings.`;
        } else if (Number(site.bookingCount) === 0) {
          action = "decrease";
          suggestedRate = Math.round(currentRate * 0.85 * 100) / 100;
          reasoning = `No bookings in the last 90 days. Consider a 15% introductory rate reduction.`;
        } else {
          reasoning = `Occupancy at ${occupancy.toFixed(1)}% is within healthy range. Current rate appears appropriate.`;
        }

        return {
          siteId: site.siteId,
          siteNumber: site.siteNumber,
          centreName: site.centreName,
          currentRate,
          suggestedRate,
          action,
          reasoning,
          occupancy: Math.round(occupancy * 10) / 10,
          bookingCount: Number(site.bookingCount),
          revenue: Number(site.totalRevenue),
        };
      }).filter(r => r.action !== "maintain");

      return recommendations;
    }),
});
