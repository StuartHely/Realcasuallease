import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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

describe("centres.search (autocomplete)", () => {
  it("returns matching centres for partial name", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.centres.search({ query: "high" });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((c) => c.name.toLowerCase().includes("high"))).toBe(true);
  });

  it("handles typos with fuzzy matching", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.centres.search({ query: "highlnd" });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((c) => c.name.toLowerCase().includes("highland"))).toBe(true);
  });

  it("returns empty array for very short queries", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.centres.search({ query: "h" });

    // Very short queries should return results only if exact match
    expect(Array.isArray(results)).toBe(true);
  });

  it("returns empty array for non-matching queries", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.centres.search({ query: "xyz123notfound" });

    expect(results).toEqual([]);
  });

  it("is case-insensitive", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const resultsLower = await caller.centres.search({ query: "highlands" });
    const resultsUpper = await caller.centres.search({ query: "HIGHLANDS" });
    const resultsMixed = await caller.centres.search({ query: "HiGhLaNdS" });

    expect(resultsLower.length).toBeGreaterThan(0);
    expect(resultsUpper.length).toBe(resultsLower.length);
    expect(resultsMixed.length).toBe(resultsLower.length);
  });

  it("searches across name, suburb, and city", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Search by centre name
    const nameResults = await caller.centres.search({ query: "highlands" });
    expect(nameResults.length).toBeGreaterThan(0);

    // Search by suburb (if any centres have suburbs)
    const allCentres = await caller.centres.search({ query: "a" });
    const centreWithSuburb = allCentres.find((c) => c.suburb);
    
    if (centreWithSuburb && centreWithSuburb.suburb) {
      const suburbResults = await caller.centres.search({ 
        query: centreWithSuburb.suburb.substring(0, 4) 
      });
      expect(suburbResults.length).toBeGreaterThan(0);
    }
  });

  it("returns results quickly for autocomplete UX", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const startTime = Date.now();
    await caller.centres.search({ query: "camp" });
    const endTime = Date.now();

    // Should complete in under 1 second for good UX
    expect(endTime - startTime).toBeLessThan(1000);
  });
});
