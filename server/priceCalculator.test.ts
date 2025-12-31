import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";


describe("Price Calculator - Preview Functionality", () => {
  let testSiteId: number;

  beforeAll(async () => {
    // Use existing site from database
    const sites = await db.getAllSites();
    if (sites.length === 0) {
      throw new Error("No sites found in database for testing");
    }
    testSiteId = sites[0].id;
  });

  it("should calculate preview for weekdays only", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

    // Monday July 7 to Friday July 11, 2025 (5 weekdays)
    const result = await caller.bookings.calculatePreview({
      siteId: testSiteId,
      startDate: new Date("2025-07-07"),
      endDate: new Date("2025-07-11"),
    });

    expect(result.weekdayCount).toBe(5);
    expect(result.weekendCount).toBe(0);
    expect(result.weekdayRate).toBeGreaterThan(0);
    expect(result.subtotal).toBeGreaterThan(0);
    expect(result.gstAmount).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("should calculate preview for weekend only", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

    // Saturday-Sunday August 2-3, 2025
    const result = await caller.bookings.calculatePreview({
      siteId: testSiteId,
      startDate: new Date("2025-08-02"),
      endDate: new Date("2025-08-03"),
    });

    expect(result.weekdayCount).toBe(0);
    expect(result.weekendCount).toBe(2);
    expect(result.weekendRate).toBeGreaterThan(0);
    expect(result.subtotal).toBeGreaterThan(0);
    expect(result.gstAmount).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("should calculate preview for mixed weekdays and weekend", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

    // Friday July 4 to Monday July 7, 2025 (2 weekdays + 2 weekend days)
    const result = await caller.bookings.calculatePreview({
      siteId: testSiteId,
      startDate: new Date("2025-07-04"),
      endDate: new Date("2025-07-07"),
    });

    expect(result.weekdayCount).toBe(2); // Fri, Mon
    expect(result.weekendCount).toBe(2); // Sat, Sun
    expect(result.subtotal).toBeGreaterThan(0);
    expect(result.gstAmount).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("should return seasonal days array", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

    const result = await caller.bookings.calculatePreview({
      siteId: testSiteId,
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-07-05"),
    });

    expect(Array.isArray(result.seasonalDays)).toBe(true);
  });

  it("should throw error for invalid site ID", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

    await expect(
      caller.bookings.calculatePreview({
        siteId: 999999,
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-05"),
      })
    ).rejects.toThrow("Site not found");
  });

  it("should handle single day booking", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });

    // Single weekday
    const result = await caller.bookings.calculatePreview({
      siteId: testSiteId,
      startDate: new Date("2025-07-07"), // Monday
      endDate: new Date("2025-07-07"),
    });

    expect(result.weekdayCount).toBe(1);
    expect(result.weekendCount).toBe(0);
    expect(result.subtotal).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });
});
