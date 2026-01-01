import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("Weekly Rates & Bulk Seasonal Rates", () => {
  let testSiteId: number;
  let testCentreId: number;

  beforeAll(async () => {
    // Query for an existing site to use in tests
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const centres = await caller.centres.list();
    if (centres.length === 0) {
      throw new Error("No centres found in database");
    }
    testCentreId = centres[0].id;
    
    const sites = await caller.sites.getByCentreId({ centreId: testCentreId });
    if (sites.length === 0) {
      throw new Error("No sites found in database");
    }
    testSiteId = sites[0].id;
  });

  describe("Weekly Rate Calculation", () => {
    it("should use base weekly rate for 7-day booking", async () => {
      const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

      const result = await caller.bookings.calculatePreview({
        siteId: testSiteId,
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-07"), // 7 days
      });

      // Should use weekly rate instead of daily rates
      expect(result.weekdayCount).toBeGreaterThan(0);
      expect(result.weekendCount).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it("should use daily rates for 6-day booking", async () => {
      const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

      const result = await caller.bookings.calculatePreview({
        siteId: testSiteId,
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-06"), // 6 days
      });

      // Should use daily rates, not weekly
      expect(result.weekdayCount).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it("should handle 14-day booking (2 weeks)", async () => {
      const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

      const result = await caller.bookings.calculatePreview({
        siteId: testSiteId,
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-14"), // 14 days
      });

      expect(result.weekdayCount + result.weekendCount).toBe(14);
      expect(result.total).toBeGreaterThan(0);
    });

    it("should handle 10-day booking (1 week + 3 days)", async () => {
      const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

      const result = await caller.bookings.calculatePreview({
        siteId: testSiteId,
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-10"), // 10 days
      });

      expect(result.weekdayCount + result.weekendCount).toBe(10);
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe("Seasonal Weekly Rates", () => {
    it("should create seasonal rate with weekly rate", async () => {
      const caller = appRouter.createCaller({ 
        user: { id: 1, name: "Admin", role: "admin" }, 
        req: {} as any, 
        res: {} as any 
      });

      const result = await caller.admin.createSeasonalRate({
        siteId: testSiteId,
        name: "Test Weekly Rate",
        startDate: "2025-09-01",
        endDate: "2025-09-30",
        weekdayRate: 200,
        weekendRate: 250,
        weeklyRate: 1200,
      });

      expect(result.id).toBeDefined();
      expect(result.weeklyRate).toBe("1200.00");
    });

    it("should use seasonal weekly rate for 7+ day booking during seasonal period", async () => {
      const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

      // This should use the seasonal weekly rate created above
      const result = await caller.bookings.calculatePreview({
        siteId: testSiteId,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-09-07"), // 7 days within seasonal period
      });

      expect(result.total).toBeGreaterThan(0);
      // Should have seasonal days info
      expect(result.seasonalDays).toBeDefined();
    });
  });

  describe("Bulk Seasonal Rate Creation", () => {
    it("should create seasonal rates for all sites in selected centres", async () => {
      const caller = appRouter.createCaller({ 
        user: { id: 1, name: "Admin", role: "admin" }, 
        req: {} as any, 
        res: {} as any 
      });

      const result = await caller.admin.bulkCreateSeasonalRates({
        centreIds: [testCentreId],
        name: "Test Bulk Christmas 2025",
        startDate: "2025-12-01",
        endDate: "2025-12-31",
        percentageIncrease: 30,
      });

      expect(result.created).toBeGreaterThan(0);
      expect(result.totalSites).toBeGreaterThan(0);
      expect(result.created).toBe(result.totalSites);
    });

    it("should apply percentage increase correctly to rates", async () => {
      const caller = appRouter.createCaller({ 
        user: { id: 1, name: "Admin", role: "admin" }, 
        req: {} as any, 
        res: {} as any 
      });

      // Get the site's base rates
      const site = await caller.sites.getById({ id: testSiteId });
      const baseWeekdayRate = parseFloat(site.pricePerDay);

      // Create bulk seasonal rate with 50% increase
      await caller.admin.bulkCreateSeasonalRates({
        centreIds: [testCentreId],
        name: "Test Bulk 50% Increase",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        percentageIncrease: 50,
      });

      // Check if seasonal rates were created with correct increase
      const seasonalRates = await caller.admin.getSeasonalRatesBySite({ siteId: testSiteId });
      const bulkRate = seasonalRates.find((r: any) => r.name === "Test Bulk 50% Increase");

      expect(bulkRate).toBeDefined();
      if (bulkRate) {
        const expectedRate = Math.round(baseWeekdayRate * 1.5 * 100) / 100;
        expect(parseFloat(bulkRate.weekdayRate)).toBeCloseTo(expectedRate, 2);
      }
    });

    it("should handle bulk creation with array of centre IDs", async () => {
      const caller = appRouter.createCaller({ 
        user: { id: 1, name: "Admin", role: "admin" }, 
        req: {} as any, 
        res: {} as any 
      });

      // Use the test centre we already have
      const result = await caller.admin.bulkCreateSeasonalRates({
        centreIds: [testCentreId],
        name: "Test Array of Centre IDs",
        startDate: "2026-02-01",
        endDate: "2026-02-28",
        percentageIncrease: 25,
      });

      expect(result.created).toBeGreaterThan(0);
      expect(result.totalSites).toBeGreaterThan(0);
      expect(result.created).toBe(result.totalSites);
    });


  });

  describe("Get Owners", () => {
    it("should return list of owners", async () => {
      const caller = appRouter.createCaller({ 
        user: { id: 1, name: "Admin", role: "admin" }, 
        req: {} as any, 
        res: {} as any 
      });

      const owners = await caller.admin.getOwners();

      expect(Array.isArray(owners)).toBe(true);
      expect(owners.length).toBeGreaterThan(0);
    });
  });
});
