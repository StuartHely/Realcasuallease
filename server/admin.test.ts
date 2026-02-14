import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AdminUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AdminUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@casuallease.com",
    name: "Admin User",
    loginMethod: "email",
    role: "mega_admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("admin.getStats", () => {
  it("returns dashboard statistics for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.admin.getStats();

    expect(stats).toHaveProperty("totalCentres");
    expect(stats).toHaveProperty("totalSites");
    expect(stats).toHaveProperty("activeBookings");
    expect(stats).toHaveProperty("totalRevenue");
    expect(stats).toHaveProperty("monthlyRevenue");
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("recentBookings");
    
    expect(typeof stats.totalCentres).toBe("number");
    expect(typeof stats.totalSites).toBe("number");
    expect(Array.isArray(stats.recentBookings)).toBe(true);
  });
});

describe("admin.createCentre", () => {
  it("creates a new shopping centre", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const centre = await caller.admin.createCentre({
      name: "Test Centre",
      address: "123 Test St",
      suburb: "Test Suburb",
      city: "Test City",
      state: "NSW",
      postcode: "2000",
    });

    expect(centre).toHaveProperty("id");
    expect(centre.name).toBe("Test Centre");
  });
});

describe("admin.createSite", () => {
  it("creates a new site for a centre", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First create a centre
    const centre = await caller.admin.createCentre({
      name: "Test Centre for Site",
      address: "456 Test St",
      suburb: "Test Suburb",
      city: "Test City",
      state: "NSW",
      postcode: "2000",
    });

    // Then create a site
    const site = await caller.admin.createSite({
      centreId: centre.id,
      siteNumber: "TEST-1",
      description: "Test site",
      size: "3m x 2m",
      maxTables: 2,
      powerAvailable: "Yes",
      restrictions: "None",
      dailyRate: "150.00",
      weeklyRate: "750.00",
      instantBooking: true,
    });

    expect(site).toHaveProperty("id");
    expect(site.siteNumber).toBe("TEST-1");
    expect(site.centreId).toBe(centre.id);
  });
});

describe("sites.getByCentreId", () => {
  it("returns all sites for a given centre", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Get sites for Highlands Marketplace (centre ID 1)
    const sites = await caller.sites.getByCentreId({ centreId: 1 });

    expect(Array.isArray(sites)).toBe(true);
    expect(sites.length).toBeGreaterThan(0);
    expect(sites[0]).toHaveProperty("siteNumber");
    expect(sites[0]).toHaveProperty("centreId");
    expect(sites[0].centreId).toBe(1);
  });
});
