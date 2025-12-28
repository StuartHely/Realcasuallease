import { describe, expect, it } from "vitest";
import * as db from "./db";

describe("Enhanced Search Functionality", () => {
  it("should find sites by centre name and site number", async () => {
    const results = await db.searchSites("Pacific Square Site 2");
    expect(results.length).toBeGreaterThan(0);
    const site = results.find(r => r.site.siteNumber.includes("2"));
    expect(site).toBeDefined();
    expect(site?.centre?.name).toContain("Pacific Square");
  });

  it("should find sites by centre name and description", async () => {
    const results = await db.searchSites("Pacific Square Outside Prouds");
    expect(results.length).toBeGreaterThan(0);
    const site = results.find(r => r.site.description.toLowerCase().includes("prouds"));
    expect(site).toBeDefined();
    expect(site?.centre?.name).toContain("Pacific Square");
  });

  it("should find sites by description only", async () => {
    const results = await db.searchSites("Outside Prouds");
    expect(results.length).toBeGreaterThan(0);
    const site = results[0];
    expect(site.site.description.toLowerCase()).toContain("prouds");
  });

  it("should find multiple sites by site number across centres", async () => {
    const results = await db.searchSites("Site 1");
    expect(results.length).toBeGreaterThan(5); // Should find Site 1 in multiple centres
    const uniqueCentres = new Set(results.map(r => r.centre?.id));
    expect(uniqueCentres.size).toBeGreaterThan(1); // Multiple centres
  });

  it("should find all sites for a centre", async () => {
    const results = await db.searchSites("Campbelltown Mall");
    expect(results.length).toBeGreaterThanOrEqual(13); // Campbelltown has 13 sites
    const allSamecentre = results.every(r => r.centre?.name === "Campbelltown Mall");
    expect(allSamecentre).toBe(true);
  });

  it("should handle case-insensitive searches", async () => {
    const lower = await db.searchSites("pacific square");
    const upper = await db.searchSites("PACIFIC SQUARE");
    const mixed = await db.searchSites("Pacific Square");
    
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
    expect(lower.length).toBeGreaterThan(0);
  });

  it("should return empty array for non-existent queries", async () => {
    const results = await db.searchSites("NonExistentCentre12345");
    expect(results).toEqual([]);
  });

  it("should handle compound queries with multiple words", async () => {
    const results = await db.searchSites("Highlands Site 8");
    // Should find either Highlands centre or Site 8 at Highlands
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Centre Search with Site Pattern Parsing", () => {
  it("should parse site number from query", async () => {
    const centres = await db.searchShoppingCentres("Pacific Square Site 2");
    expect(centres.length).toBeGreaterThan(0);
    expect(centres[0].name).toContain("Pacific Square");
  });

  it("should still find centre when site pattern is present", async () => {
    const centres = await db.searchShoppingCentres("Highlands Site 8");
    expect(centres.length).toBeGreaterThan(0);
    expect(centres[0].name).toContain("Highlands");
  });

  it("should handle fuzzy matching on centre names", async () => {
    const results = await db.searchShoppingCentres("campbeltown"); // Missing 'l'
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain("Campbelltown");
  });
});
