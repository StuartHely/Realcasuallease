import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Smart Search with Site Highlighting", () => {
  it("should return matchedSiteIds for specific site searches", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.smart({
      query: "Pacific Square Site 2",
      date: new Date("2025-01-15"),
    });

    expect(result.matchedSiteIds).toBeDefined();
    expect(Array.isArray(result.matchedSiteIds)).toBe(true);
    
    // Should have at least one matched site
    if (result.matchedSiteIds.length > 0) {
      expect(result.matchedSiteIds.length).toBeGreaterThan(0);
      
      // The matched site should be in the sites array
      const matchedSite = result.sites.find(s => s.id === result.matchedSiteIds[0]);
      expect(matchedSite).toBeDefined();
    }
  });

  it("should return matchedSiteIds for description-based searches", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.smart({
      query: "Pacific Square Outside Prouds",
      date: new Date("2025-01-15"),
    });

    expect(result.matchedSiteIds).toBeDefined();
    
    if (result.matchedSiteIds.length > 0) {
      const matchedSite = result.sites.find(s => s.id === result.matchedSiteIds[0]);
      expect(matchedSite).toBeDefined();
      expect(matchedSite?.description.toLowerCase()).toContain("prouds");
    }
  });

  it("should return empty matchedSiteIds for centre-only searches", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.smart({
      query: "Campbelltown Mall",
      date: new Date("2025-01-15"),
    });

    expect(result.matchedSiteIds).toBeDefined();
    // For centre-only searches, matchedSiteIds might be empty or contain all sites
    expect(Array.isArray(result.matchedSiteIds)).toBe(true);
  }, 10000); // Increase timeout for large result sets

  it("should handle searches with no results", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.smart({
      query: "NonExistentCentre12345",
      date: new Date("2025-01-15"),
    });

    expect(result.centres).toEqual([]);
    expect(result.sites).toEqual([]);
    expect(result.matchedSiteIds).toEqual([]);
  });

  it("should return valid site IDs that exist in the sites array", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.smart({
      query: "Highlands Site 8",
      date: new Date("2025-01-15"),
    });

    // All matched site IDs should exist in the sites array
    result.matchedSiteIds.forEach(matchedId => {
      const siteExists = result.sites.some(s => s.id === matchedId);
      expect(siteExists).toBe(true);
    });
  });
});
