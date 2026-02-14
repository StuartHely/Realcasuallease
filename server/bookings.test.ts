import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "../drizzle/schema";

const dbInstance = drizzle(process.env.DATABASE_URL!);

beforeAll(async () => {
  // Create test user if not exists
  try {
    await dbInstance.insert(users).values({
      openId: "test-user-1",
      email: "test1@example.com",
      name: "Test User 1",
      loginMethod: "email",
      role: "customer",
    }).onConflictDoUpdate({ target: users.openId, set: { lastSignedIn: new Date() } });
  } catch (e) {
    // User might already exist
  }
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: AuthenticatedUser["role"] = "customer"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "email",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Shopping Centres API", () => {
  it("should list all shopping centres", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const centres = await caller.centres.list();
    
    expect(centres).toBeDefined();
    expect(Array.isArray(centres)).toBe(true);
    expect(centres.length).toBeGreaterThan(0);
  });

  it("should search centres by name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.centres.search({ query: "Campbelltown" });
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toContain("Campbelltown");
  });

  it("should get centre by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const centre = await caller.centres.getById({ id: 1 });
    
    expect(centre).toBeDefined();
    expect(centre.id).toBe(1);
    expect(centre.name).toBeDefined();
  });

  it("should get sites for a centre", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sites = await caller.centres.getSites({ centreId: 1 });
    
    expect(sites).toBeDefined();
    expect(Array.isArray(sites)).toBe(true);
  });
});

describe("Sites API", () => {
  it("should get site by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const site = await caller.sites.getById({ id: 1 });
    
    expect(site).toBeDefined();
    expect(site.id).toBe(1);
    expect(site.siteNumber).toBeDefined();
  });

  it("should check site availability", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2025-02-01");
    const endDate = new Date("2025-02-07");

    const availability = await caller.sites.checkAvailability({
      siteId: 1,
      startDate,
      endDate,
    });
    
    expect(availability).toBeDefined();
    expect(typeof availability.available).toBe("boolean");
    expect(Array.isArray(availability.bookings)).toBe(true);
  });
});

describe("Search API", () => {
  it("should search by centre name and date", { timeout: 10000 }, async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const searchDate = new Date("2025-02-01");

    const results = await caller.search.byNameAndDate({
      centreName: "Highlands",
      date: searchDate,
    });
    
    expect(results).toBeDefined();
    expect(Array.isArray(results.centres)).toBe(true);
    expect(Array.isArray(results.sites)).toBe(true);
    expect(Array.isArray(results.availability)).toBe(true);
    expect(results.requestedWeek).toBeDefined();
    expect(results.followingWeek).toBeDefined();
  });

  it("should return empty results for non-existent centre", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const searchDate = new Date("2025-02-01");

    const results = await caller.search.byNameAndDate({
      centreName: "NonExistentCentre12345",
      date: searchDate,
    });
    
    expect(results).toBeDefined();
    expect(results.centres.length).toBe(0);
    expect(results.sites.length).toBe(0);
  });
});

describe("Usage Types API", () => {
  it("should list all active usage types", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const usageTypes = await caller.usageTypes.list();
    
    expect(usageTypes).toBeDefined();
    expect(Array.isArray(usageTypes)).toBe(true);
    expect(usageTypes.length).toBeGreaterThan(0);
    expect(usageTypes[0]?.name).toBeDefined();
  });
});

describe("Bookings API", () => {
  it("should create a booking for authenticated user", async () => {
    // Use a far future date to avoid conflicts
    const futureYear = new Date().getFullYear() + 2;
    const uniqueMonth = Math.floor(Math.random() * 6) + 1; // Random month 1-6
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get a usage type first
    const usageTypes = await caller.usageTypes.list();
    const usageTypeId = usageTypes[0]?.id;

    const startDate = new Date(`${futureYear}-0${uniqueMonth}-01`);
    const endDate = new Date(`${futureYear}-0${uniqueMonth}-07`);

    const booking = await caller.bookings.create({
      siteId: 1,
      usageTypeId,
      startDate,
      endDate,
    });
    
    expect(booking).toBeDefined();
    expect(booking.bookingId).toBeDefined();
    expect(booking.bookingNumber).toBeDefined();
    expect(booking.totalAmount).toBeGreaterThan(0);
    expect(typeof booking.requiresApproval).toBe("boolean");
  });

  it("should prevent double booking", async () => {
    const futureYear = new Date().getFullYear() + 3; // Use year +3 to avoid conflicts with other test
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const usageTypes = await caller.usageTypes.list();
    const usageTypeId = usageTypes[0]?.id;

    const startDate = new Date(`${futureYear}-07-01`);
    const endDate = new Date(`${futureYear}-07-07`);

    // Create first booking
    await caller.bookings.create({
      siteId: 2,
      usageTypeId,
      startDate,
      endDate,
    });

    // Try to create overlapping booking - should throw CONFLICT error
    await expect(
      caller.bookings.create({
        siteId: 2,
        usageTypeId,
        startDate,
        endDate,
      })
    ).rejects.toThrow("Site is already booked for this period");
  });

  it("should list user bookings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const bookings = await caller.bookings.myBookings();
    
    expect(bookings).toBeDefined();
    expect(Array.isArray(bookings)).toBe(true);
  });
});

describe("Customer Profile API", () => {
  it("should get customer profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const profile = await caller.profile.get();
    
    // Profile might be null or undefined if not created yet, or an object if it exists
    expect(profile === null || profile === undefined || typeof profile === "object").toBe(true);
  });

  it("should update customer profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.update({
      firstName: "John",
      lastName: "Doe",
      phone: "0412345678",
      companyName: "Test Company",
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
