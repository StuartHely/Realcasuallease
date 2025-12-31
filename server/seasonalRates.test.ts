import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { getSeasonalRatesBySiteId, createSeasonalRate, updateSeasonalRate, deleteSeasonalRate } from "./seasonalRatesDb";

// Mock context for testing
const createMockContext = (role: string = "mega_admin"): TrpcContext => ({
  user: {
    id: 1,
    openId: "test-user",
    name: "Test Admin",
    email: "admin@test.com",
    role: role as any,
    createdAt: new Date(),
  },
  req: {} as any,
  res: {} as any,
});



describe("Seasonal Pricing - Database Functions", () => {
  let testSiteId: number;
  let testSeasonalRateId: number;

  beforeAll(async () => {
    // Get a test site from the database
    const sites = await db.getAllSites();
    if (sites.length === 0) {
      throw new Error("No sites found in database for testing");
    }
    testSiteId = sites[0].id;
  });

  it("should create a seasonal rate", async () => {
    const seasonalRate = await createSeasonalRate({
      siteId: testSiteId,
      name: "Test Christmas 2024",
      startDate: "2024-12-20",
      endDate: "2024-12-27",
      weekdayRate: 250.00,
      weekendRate: 300.00,
    });

    expect(seasonalRate).toBeDefined();
    expect(seasonalRate.id).toBeGreaterThan(0);
    testSeasonalRateId = seasonalRate.id;
  });

  it("should retrieve seasonal rates by site ID", async () => {
    const rates = await getSeasonalRatesBySiteId(testSiteId);
    expect(rates).toBeDefined();
    expect(Array.isArray(rates)).toBe(true);
    expect(rates.length).toBeGreaterThan(0);
    
    const testRate = rates.find(r => r.id === testSeasonalRateId);
    expect(testRate).toBeDefined();
    expect(testRate?.name).toBe("Test Christmas 2024");
    expect(parseFloat(testRate?.weekdayRate || "0")).toBe(250);
    expect(parseFloat(testRate?.weekendRate || "0")).toBe(300);
  });

  it("should update a seasonal rate", async () => {
    const updated = await updateSeasonalRate(testSeasonalRateId, {
      name: "Updated Christmas 2024",
      weekdayRate: 275.00,
    });

    expect(updated).toBe(true);

    const rates = await getSeasonalRatesBySiteId(testSiteId);
    const testRate = rates.find(r => r.id === testSeasonalRateId);
    expect(testRate?.name).toBe("Updated Christmas 2024");
    expect(parseFloat(testRate?.weekdayRate || "0")).toBe(275);
    expect(parseFloat(testRate?.weekendRate || "0")).toBe(300); // Should remain unchanged
  });

  it("should delete a seasonal rate", async () => {
    const deleted = await deleteSeasonalRate(testSeasonalRateId);
    expect(deleted).toBe(true);

    const rates = await getSeasonalRatesBySiteId(testSiteId);
    const testRate = rates.find(r => r.id === testSeasonalRateId);
    expect(testRate).toBeUndefined();
  });
});

describe("Seasonal Pricing - tRPC Procedures", () => {
  let testSiteId: number;
  let testSeasonalRateId: number;

  beforeAll(async () => {
    const sites = await db.getAllSites();
    if (sites.length === 0) {
      throw new Error("No sites found in database for testing");
    }
    testSiteId = sites[0].id;
  });

  it("should allow admin to create seasonal rate via tRPC", async () => {
    const caller = appRouter.createCaller(createMockContext("mega_admin"));
    
    const result = await caller.admin.createSeasonalRate({
      siteId: testSiteId,
      name: "Summer Sale 2025",
      startDate: "2025-01-15",
      endDate: "2025-01-31",
      weekdayRate: 180.00,
      weekendRate: 220.00,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    testSeasonalRateId = result.id;
  });

  it("should allow admin to retrieve seasonal rates via tRPC", async () => {
    const caller = appRouter.createCaller(createMockContext("mega_admin"));
    
    const rates = await caller.admin.getSeasonalRatesBySite({
      siteId: testSiteId,
    });

    expect(rates).toBeDefined();
    expect(Array.isArray(rates)).toBe(true);
    
    const testRate = rates.find(r => r.id === testSeasonalRateId);
    expect(testRate).toBeDefined();
    expect(testRate?.name).toBe("Summer Sale 2025");
  });

  it("should allow admin to update seasonal rate via tRPC", async () => {
    const caller = appRouter.createCaller(createMockContext("mega_admin"));
    
    const result = await caller.admin.updateSeasonalRate({
      id: testSeasonalRateId,
      name: "Extended Summer Sale 2025",
      endDate: "2025-02-07",
    });

    expect(result).toBe(true);

    const rates = await caller.admin.getSeasonalRatesBySite({
      siteId: testSiteId,
    });
    
    const testRate = rates.find(r => r.id === testSeasonalRateId);
    expect(testRate?.name).toBe("Extended Summer Sale 2025");
    expect(testRate?.endDate).toBe("2025-02-07");
  });

  it("should allow admin to delete seasonal rate via tRPC", async () => {
    const caller = appRouter.createCaller(createMockContext("mega_admin"));
    
    const result = await caller.admin.deleteSeasonalRate({
      id: testSeasonalRateId,
    });

    expect(result).toBe(true);

    const rates = await caller.admin.getSeasonalRatesBySite({
      siteId: testSiteId,
    });
    
    const testRate = rates.find(r => r.id === testSeasonalRateId);
    expect(testRate).toBeUndefined();
  });

  it("should deny customer access to seasonal rate management", async () => {
    const caller = appRouter.createCaller(createMockContext("customer"));
    
    await expect(
      caller.admin.createSeasonalRate({
        siteId: testSiteId,
        name: "Unauthorized Rate",
        startDate: "2025-03-01",
        endDate: "2025-03-07",
      })
    ).rejects.toThrow();
  });

  it("should handle creating seasonal rate with only weekday rate", async () => {
    const caller = appRouter.createCaller(createMockContext("mega_admin"));
    
    const result = await caller.admin.createSeasonalRate({
      siteId: testSiteId,
      name: "Weekday Special",
      startDate: "2025-02-10",
      endDate: "2025-02-14",
      weekdayRate: 150.00,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);

    // Clean up
    await caller.admin.deleteSeasonalRate({ id: result.id });
  });

  it("should handle creating seasonal rate with only weekend rate", async () => {
    const caller = appRouter.createCaller(createMockContext("mega_admin"));
    
    const result = await caller.admin.createSeasonalRate({
      siteId: testSiteId,
      name: "Weekend Special",
      startDate: "2025-02-15",
      endDate: "2025-02-16",
      weekendRate: 350.00,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);

    // Clean up
    await caller.admin.deleteSeasonalRate({ id: result.id });
  });
});

describe("Seasonal Pricing - Validation", () => {
  let testSiteId: number;

  beforeAll(async () => {
    const sites = await db.getAllSites();
    if (sites.length === 0) {
      throw new Error("No sites found in database for testing");
    }
    testSiteId = sites[0].id;
  });

  it("should reject seasonal rate with missing site ID", async () => {
    const caller = appRouter.createCaller(createMockContext("mega_admin"));
    
    await expect(
      caller.admin.createSeasonalRate({
        name: "Test Rate",
        startDate: "2024-12-20",
        endDate: "2024-12-27",
        weekdayRate: 200.00,
      } as any)
    ).rejects.toThrow();
  });
});
