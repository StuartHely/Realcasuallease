import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("State-based Centre Browsing", () => {
  it("should retrieve centres by state (NSW)", async () => {
    const centres = await db.getShoppingCentresByState("NSW");
    
    expect(centres).toBeDefined();
    expect(Array.isArray(centres)).toBe(true);
    expect(centres.length).toBeGreaterThan(0);
    
    // All centres should be in NSW
    centres.forEach(centre => {
      expect(centre.state).toBe("NSW");
    });
    
    // Should include known NSW centres
    const centreNames = centres.map(c => c.name);
    expect(centreNames).toContain("Highlands Marketplace");
    expect(centreNames).toContain("Campbelltown Mall");
    expect(centreNames).toContain("Carnes Hill Marketplace");
  });

  it("should retrieve centres by state (VIC)", async () => {
    const centres = await db.getShoppingCentresByState("VIC");
    
    expect(centres).toBeDefined();
    expect(Array.isArray(centres)).toBe(true);
    expect(centres.length).toBeGreaterThan(0);
    
    // All centres should be in VIC
    centres.forEach(centre => {
      expect(centre.state).toBe("VIC");
    });
    
    // Should include Corio Village
    const centreNames = centres.map(c => c.name);
    expect(centreNames).toContain("Corio Village");
  });

  it("should retrieve centres by state (WA)", async () => {
    const centres = await db.getShoppingCentresByState("WA");
    
    expect(centres).toBeDefined();
    expect(Array.isArray(centres)).toBe(true);
    expect(centres.length).toBeGreaterThan(0);
    
    // All centres should be in WA
    centres.forEach(centre => {
      expect(centre.state).toBe("WA");
    });
    
    // Should include Wanneroo Central
    const centreNames = centres.map(c => c.name);
    expect(centreNames).toContain("Wanneroo Central");
  });

  it("should return empty array for states with no centres", async () => {
    const centres = await db.getShoppingCentresByState("QLD");
    
    expect(centres).toBeDefined();
    expect(Array.isArray(centres)).toBe(true);
    expect(centres.length).toBe(0);
  });

  it("should return centres with complete address information", async () => {
    const centres = await db.getShoppingCentresByState("NSW");
    
    expect(centres.length).toBeGreaterThan(0);
    
    // Check first centre has address fields
    const firstCentre = centres[0];
    expect(firstCentre.address).toBeTruthy();
    expect(firstCentre.suburb).toBeTruthy();
    expect(firstCentre.city).toBeTruthy();
    expect(firstCentre.state).toBe("NSW");
    expect(firstCentre.postcode).toBeTruthy();
  });

  it("should retrieve centre by ID with all details", async () => {
    // First get a centre from NSW
    const centres = await db.getShoppingCentresByState("NSW");
    expect(centres.length).toBeGreaterThan(0);
    
    const centreId = centres[0].id;
    const centre = await db.getShoppingCentreById(centreId);
    
    expect(centre).toBeDefined();
    expect(centre.id).toBe(centreId);
    expect(centre.name).toBeTruthy();
    expect(centre.address).toBeTruthy();
    expect(centre.state).toBe("NSW");
  });

  it("should retrieve sites for a centre", async () => {
    // Get Carnes Hill Marketplace (has 7 sites)
    const centres = await db.getShoppingCentresByState("NSW");
    const carnesHill = centres.find(c => c.name === "Carnes Hill Marketplace");
    
    expect(carnesHill).toBeDefined();
    
    const sites = await db.getSitesByCentreId(carnesHill!.id);
    
    expect(sites).toBeDefined();
    expect(Array.isArray(sites)).toBe(true);
    expect(sites.length).toBeGreaterThan(0);
    
    // All sites should belong to this centre
    sites.forEach(site => {
      expect(site.centreId).toBe(carnesHill!.id);
    });
  });

  it("should have proper pricing for sites", async () => {
    const centres = await db.getShoppingCentresByState("NSW");
    const centre = centres[0];
    const sites = await db.getSitesByCentreId(centre.id);
    
    expect(sites.length).toBeGreaterThan(0);
    
    // Check pricing fields exist and are valid
    sites.forEach(site => {
      expect(site.pricePerDay).toBeDefined();
      expect(site.pricePerWeek).toBeDefined();
      
      // Convert to number and check they're positive
      const dayPrice = Number(site.pricePerDay);
      const weekPrice = Number(site.pricePerWeek);
      
      expect(dayPrice).toBeGreaterThan(0);
      expect(weekPrice).toBeGreaterThan(0);
    });
  });
});
