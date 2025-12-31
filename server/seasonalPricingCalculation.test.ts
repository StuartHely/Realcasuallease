import { describe, it, expect, beforeAll } from "vitest";
import { calculateBookingCost } from "./bookingCalculation";
import { createSeasonalRate, deleteSeasonalRate } from "./seasonalRatesDb";
import * as db from "./db";

describe("Seasonal Pricing - Booking Cost Calculation", () => {
  let testSiteId: number;
  let testSite: any;
  let seasonalRateId: number;

  beforeAll(async () => {
    // Get a test site
    const sites = await db.getAllSites();
    if (sites.length === 0) {
      throw new Error("No sites found in database for testing");
    }
    testSite = sites[0];
    testSiteId = testSite.id;
  });

  it("should calculate cost with base rates when no seasonal rates exist", async () => {
    const startDate = new Date("2025-06-01"); // Sunday
    const endDate = new Date("2025-06-07"); // Saturday
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    expect(result).toBeDefined();
    expect(result.totalAmount).toBeGreaterThan(0);
    expect(result.weekdayCount).toBe(5); // Mon-Fri
    expect(result.weekendCount).toBe(2); // Sat-Sun
    expect(result.seasonalDays).toBeUndefined();
  });

  it("should apply seasonal weekday rate over base rate", async () => {
    // Create a seasonal rate for testing
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Test Seasonal Rate",
      startDate: "2025-07-01",
      endDate: "2025-07-07",
      weekdayRate: 300.00, // Higher than base rate
    });
    seasonalRateId = seasonalRate.id;

    const startDate = new Date("2025-07-01"); // Tuesday
    const endDate = new Date("2025-07-03"); // Thursday (3 weekdays)
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    expect(result.seasonalDays).toBeDefined();
    expect(result.seasonalDays?.length).toBe(3);
    expect(result.totalAmount).toBe(900); // 3 days * $300
    
    // Clean up
    await deleteSeasonalRate(seasonalRateId);
  });

  it("should apply seasonal weekend rate over base weekend rate", async () => {
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Weekend Special",
      startDate: "2025-08-02",
      endDate: "2025-08-03",
      weekendRate: 400.00,
    });
    seasonalRateId = seasonalRate.id;

    const startDate = new Date("2025-08-02"); // Saturday
    const endDate = new Date("2025-08-03"); // Sunday
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    expect(result.seasonalDays).toBeDefined();
    expect(result.seasonalDays?.length).toBe(2);
    expect(result.totalAmount).toBe(800); // 2 days * $400
    expect(result.weekendCount).toBe(2);
    
    // Clean up
    await deleteSeasonalRate(seasonalRateId);
  });

  it("should apply both seasonal weekday and weekend rates in same period", async () => {
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Mixed Rate Period",
      startDate: "2025-09-01",
      endDate: "2025-09-07",
      weekdayRate: 250.00,
      weekendRate: 350.00,
    });
    seasonalRateId = seasonalRate.id;

    const startDate = new Date("2025-09-01"); // Monday
    const endDate = new Date("2025-09-07"); // Sunday (5 weekdays + 2 weekend)
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    expect(result.seasonalDays).toBeDefined();
    expect(result.seasonalDays?.length).toBe(7);
    expect(result.weekdayCount).toBe(5);
    expect(result.weekendCount).toBe(2);
    expect(result.totalAmount).toBe((5 * 250) + (2 * 350)); // 1250 + 700 = 1950
    
    // Clean up
    await deleteSeasonalRate(seasonalRateId);
  });

  it("should use seasonal weekday rate for weekends if only weekday rate is set", async () => {
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Weekday Only Rate",
      startDate: "2025-10-04",
      endDate: "2025-10-05",
      weekdayRate: 280.00,
    });
    seasonalRateId = seasonalRate.id;

    const startDate = new Date("2025-10-04"); // Saturday
    const endDate = new Date("2025-10-05"); // Sunday
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    expect(result.seasonalDays).toBeDefined();
    expect(result.totalAmount).toBe(560); // 2 days * $280 (weekday rate applied to weekend)
    
    // Clean up
    await deleteSeasonalRate(seasonalRateId);
  });

  it("should handle partial seasonal rate periods (some days seasonal, some base)", async () => {
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Partial Period",
      startDate: "2025-11-03",
      endDate: "2025-11-05",
      weekdayRate: 300.00,
    });
    seasonalRateId = seasonalRate.id;

    // Booking spans Nov 1-7, but seasonal rate only covers Nov 3-5
    const startDate = new Date("2025-11-01"); // Saturday
    const endDate = new Date("2025-11-07"); // Friday
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    expect(result.seasonalDays).toBeDefined();
    expect(result.seasonalDays?.length).toBe(3); // Only Nov 3-5 are seasonal
    
    // Nov 1-2 (Sat-Sun): base weekend rate
    // Nov 3-5 (Mon-Wed): seasonal rate $300/day
    // Nov 6-7 (Thu-Fri): base weekday rate
    const basePricePerDay = Number(testSite.pricePerDay);
    const baseWeekendPrice = testSite.weekendPricePerDay ? Number(testSite.weekendPricePerDay) : basePricePerDay;
    
    const expectedTotal = 
      (2 * baseWeekendPrice) + // Nov 1-2
      (3 * 300) + // Nov 3-5 seasonal
      (2 * basePricePerDay); // Nov 6-7
    
    // Verify the calculation is correct
    expect(result.totalAmount).toBeGreaterThan(0);
    expect(result.weekdayCount).toBe(5); // Mon-Fri
    expect(result.weekendCount).toBe(2); // Sat-Sun
    expect(result.seasonalDays?.length).toBe(3); // Nov 3-5
    
    // The total should match the expected calculation
    expect(result.totalAmount).toBe(expectedTotal);
    
    // Clean up
    await deleteSeasonalRate(seasonalRateId);
  });

  it("should prioritize seasonal rate over weekend rate", async () => {
    // This test confirms priority: Seasonal > Weekend > Base
    const basePricePerDay = Number(testSite.pricePerDay);
    const baseWeekendPrice = testSite.weekendPricePerDay ? Number(testSite.weekendPricePerDay) : basePricePerDay;
    
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Priority Test",
      startDate: "2025-12-06",
      endDate: "2025-12-07",
      weekendRate: 500.00, // Much higher than base weekend rate
    });
    seasonalRateId = seasonalRate.id;

    const startDate = new Date("2025-12-06"); // Saturday
    const endDate = new Date("2025-12-07"); // Sunday
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    // Should use seasonal weekend rate ($500), not base weekend rate
    expect(result.totalAmount).toBe(1000); // 2 * $500
    expect(result.totalAmount).toBeGreaterThan(2 * baseWeekendPrice);
    
    // Clean up
    await deleteSeasonalRate(seasonalRateId);
  });

  it("should return seasonal day information for transparency", async () => {
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Christmas Special",
      startDate: "2025-12-24",
      endDate: "2025-12-26",
      weekdayRate: 350.00,
      weekendRate: 450.00,
    });
    seasonalRateId = seasonalRate.id;

    const startDate = new Date("2025-12-24"); // Wednesday
    const endDate = new Date("2025-12-26"); // Friday
    
    const result = await calculateBookingCost(testSite, startDate, endDate);
    
    expect(result.seasonalDays).toBeDefined();
    expect(result.seasonalDays?.length).toBe(3);
    
    // Check that each seasonal day has the required information
    result.seasonalDays?.forEach(day => {
      expect(day.date).toBeDefined();
      expect(day.rate).toBeGreaterThan(0);
      expect(day.name).toBe("Christmas Special");
    });
    
    // Clean up
    await deleteSeasonalRate(seasonalRateId);
  });
});
