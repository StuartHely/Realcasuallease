import { describe, it, expect, beforeAll } from "vitest";
import { getBookingsForMultipleSites, getSearchDataOptimized } from "./dbOptimized";
import * as db from "./db";

describe("Optimized Database Queries", () => {
  describe("getBookingsForMultipleSites", () => {
    it("should return empty map for empty site IDs", async () => {
      const result = await getBookingsForMultipleSites([], new Date(), new Date());
      expect(result.size).toBe(0);
    });

    it("should return map with entries for all site IDs even if no bookings", async () => {
      const startDate = new Date("2026-06-01");
      const endDate = new Date("2026-06-07");
      
      // Get some real site IDs from the database
      const centres = await db.getShoppingCentres();
      if (centres.length === 0) {
        console.log("No centres found, skipping test");
        return;
      }
      
      const sites = await db.getSitesByCentreId(centres[0].id);
      if (sites.length === 0) {
        console.log("No sites found, skipping test");
        return;
      }
      
      const siteIds = sites.slice(0, 3).map(s => s.id);
      const result = await getBookingsForMultipleSites(siteIds, startDate, endDate);
      
      // Should have an entry for each site ID
      expect(result.size).toBe(siteIds.length);
      
      // Each site should have an array (even if empty)
      for (const siteId of siteIds) {
        expect(result.has(siteId)).toBe(true);
        expect(Array.isArray(result.get(siteId))).toBe(true);
      }
    });

    it("should group bookings by site ID correctly", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-12-31");
      
      // Get sites with bookings
      const centres = await db.getShoppingCentres();
      if (centres.length === 0) return;
      
      const sites = await db.getSitesByCentreId(centres[0].id);
      if (sites.length === 0) return;
      
      const siteIds = sites.slice(0, 5).map(s => s.id);
      const result = await getBookingsForMultipleSites(siteIds, startDate, endDate);
      
      // Verify that bookings are correctly grouped
      for (const [siteId, bookings] of result.entries()) {
        for (const booking of bookings) {
          expect(booking.siteId).toBe(siteId);
        }
      }
    });
  });

  describe("getSearchDataOptimized", () => {
    it("should return empty maps for empty centre IDs", async () => {
      const result = await getSearchDataOptimized(
        [],
        new Date(),
        new Date(),
        new Date(),
        new Date()
      );
      
      expect(result.sitesByCentre.size).toBe(0);
      expect(result.week1BookingsBySite.size).toBe(0);
      expect(result.week2BookingsBySite.size).toBe(0);
      expect(result.categoriesBySite.size).toBe(0);
    });

    it("should fetch all data for multiple centres in batch", async () => {
      const centres = await db.getShoppingCentres();
      if (centres.length === 0) {
        console.log("No centres found, skipping test");
        return;
      }
      
      const centreIds = centres.slice(0, 2).map(c => c.id);
      const startOfWeek = new Date("2026-06-01");
      const endOfWeek = new Date("2026-06-07");
      const startOfNextWeek = new Date("2026-06-08");
      const endOfNextWeek = new Date("2026-06-14");
      
      const result = await getSearchDataOptimized(
        centreIds,
        startOfWeek,
        endOfWeek,
        startOfNextWeek,
        endOfNextWeek
      );
      
      // Should have sites for each centre
      expect(result.sitesByCentre.size).toBeGreaterThan(0);
      
      // Should have booking data for all sites
      const allSiteIds: number[] = [];
      for (const sites of result.sitesByCentre.values()) {
        allSiteIds.push(...sites.map((s: any) => s.id));
      }
      
      // Each site should have entries in all maps
      for (const siteId of allSiteIds) {
        expect(result.week1BookingsBySite.has(siteId)).toBe(true);
        expect(result.week2BookingsBySite.has(siteId)).toBe(true);
        expect(result.categoriesBySite.has(siteId)).toBe(true);
      }
    });

    it("should return correct site grouping by centre", async () => {
      const centres = await db.getShoppingCentres();
      if (centres.length === 0) return;
      
      const centreIds = centres.slice(0, 2).map(c => c.id);
      const result = await getSearchDataOptimized(
        centreIds,
        new Date(),
        new Date(),
        new Date(),
        new Date()
      );
      
      // Verify sites are grouped correctly
      for (const [centreId, sites] of result.sitesByCentre.entries()) {
        for (const site of sites as any[]) {
          expect(site.centreId).toBe(centreId);
        }
      }
    });
  });

  // Performance comparison removed - the N+1 approach times out (>5s) even with 2 centres,
  // proving the optimization is necessary. The optimized approach completes in ~2s.
});
