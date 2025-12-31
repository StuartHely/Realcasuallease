import { describe, it, expect } from "vitest";
import { calculateBookingCost } from "./bookingCalculation";

describe("Weekend Rate Calculation", () => {
  const site = {
    pricePerDay: "100.00",
    pricePerWeek: "600.00",
    weekendPricePerDay: "150.00",
  };

  const siteNoWeekendRate = {
    pricePerDay: "100.00",
    pricePerWeek: "600.00",
    weekendPricePerDay: null,
  };

  it("should calculate cost for weekdays only (Mon-Fri)", () => {
    // Monday Jan 6, 2025 to Friday Jan 10, 2025 (5 weekdays)
    const startDate = new Date(2025, 0, 6); // Jan 6, 2025 local time
    const endDate = new Date(2025, 0, 10); // Jan 10, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    expect(result.weekdayCount).toBe(5);
    expect(result.weekendCount).toBe(0);
    expect(result.totalAmount).toBe(500); // 5 * 100
  });

  it("should calculate cost for weekend only (Sat-Sun)", () => {
    // Saturday Jan 11, 2025 to Sunday Jan 12, 2025 (2 weekend days)
    const startDate = new Date(2025, 0, 11); // Jan 11, 2025 local time
    const endDate = new Date(2025, 0, 12); // Jan 12, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    expect(result.weekdayCount).toBe(0);
    expect(result.weekendCount).toBe(2);
    expect(result.totalAmount).toBe(300); // 2 * 150
  });

  it("should calculate cost for mixed week (Mon-Sun)", () => {
    // Monday Jan 6, 2025 to Sunday Jan 12, 2025 (5 weekdays + 2 weekend days)
    const startDate = new Date(2025, 0, 6); // Jan 6, 2025 local time
    const endDate = new Date(2025, 0, 12); // Jan 12, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    expect(result.weekdayCount).toBe(5);
    expect(result.weekendCount).toBe(2);
    // Should use weekly rate: 600
    expect(result.totalAmount).toBe(600);
  });

  it("should calculate cost for 2 weeks", () => {
    // Monday Jan 6, 2025 to Sunday Jan 19, 2025 (14 days = 2 weeks)
    const startDate = new Date(2025, 0, 6); // Jan 6, 2025 local time
    const endDate = new Date(2025, 0, 19); // Jan 19, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    expect(result.totalAmount).toBe(1200); // 2 * 600
  });

  it("should calculate cost for 1 week + 3 weekdays", () => {
    // Monday Jan 6, 2025 to Wednesday Jan 15, 2025 (7 days + 3 days)
    const startDate = new Date(2025, 0, 6); // Jan 6, 2025 local time
    const endDate = new Date(2025, 0, 15); // Jan 15, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    // 1 week (600) + 3 weekdays (3 * 100)
    expect(result.totalAmount).toBe(900);
  });

  it("should calculate cost for 1 week + weekend", () => {
    // Monday Jan 6, 2025 to Sat Jan 18, 2025 = 13 days (1 week + 6 days)
    // Remaining 6 days: Mon 13, Tue 14, Wed 15, Thu 16, Fri 17 (5 weekdays), Sat 18 (1 weekend)
    const startDate = new Date(2025, 0, 6); // Jan 6, 2025 local time
    const endDate = new Date(2025, 0, 18); // Jan 18, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    // 1 week (600) + 5 weekdays (500) + 1 weekend day (150) = 1250
    expect(result.totalAmount).toBe(1250);
  });

  it("should default weekend rate to weekday rate when not specified", () => {
    // Saturday Jan 11, 2025 to Sunday Jan 12, 2025 (2 weekend days)
    const startDate = new Date(2025, 0, 11); // Jan 11, 2025 local time
    const endDate = new Date(2025, 0, 12); // Jan 12, 2025 local time

    const result = calculateBookingCost(siteNoWeekendRate, startDate, endDate);

    expect(result.weekendCount).toBe(2);
    expect(result.totalAmount).toBe(200); // 2 * 100 (uses weekday rate)
  });

  it("should handle single day booking on weekend", () => {
    // Saturday Jan 11, 2025 (1 day)
    const startDate = new Date(2025, 0, 11); // Jan 11, 2025 local time
    const endDate = new Date(2025, 0, 11); // Jan 11, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    expect(result.weekendCount).toBe(1);
    expect(result.totalAmount).toBe(150); // 1 * 150
  });

  it("should handle single day booking on weekday", () => {
    // Monday Jan 6, 2025 (1 day)
    const startDate = new Date(2025, 0, 6); // Jan 6, 2025 local time
    const endDate = new Date(2025, 0, 6); // Jan 6, 2025 local time

    const result = calculateBookingCost(site, startDate, endDate);

    expect(result.weekdayCount).toBe(1);
    expect(result.totalAmount).toBe(100); // 1 * 100
  });
});
