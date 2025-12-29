import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Map Management", () => {
  it("should upload centre map and return URL", async () => {
    // Get a test centre
    const centres = await db.getShoppingCentresByState("NSW");
    expect(centres.length).toBeGreaterThan(0);
    
    const testCentre = centres[0];
    
    // Create a small test image (1x1 pixel PNG in base64)
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    const result = await db.uploadCentreMap(testCentre.id, testImageBase64, "test-map.png");
    
    expect(result).toBeDefined();
    expect(result.mapUrl).toBeTruthy();
    expect(typeof result.mapUrl).toBe("string");
    expect(result.mapUrl).toContain("http");
    
    // Verify the centre was updated with the map URL
    const updatedCentre = await db.getShoppingCentreById(testCentre.id);
    expect(updatedCentre.mapImageUrl).toBe(result.mapUrl);
  });

  it("should save site markers with coordinates", async () => {
    // Get a test centre with sites
    const centres = await db.getShoppingCentresByState("NSW");
    const centreWithSites = centres.find(c => c.name === "Carnes Hill Marketplace");
    expect(centreWithSites).toBeDefined();
    
    const sites = await db.getSitesByCentreId(centreWithSites!.id);
    expect(sites.length).toBeGreaterThan(0);
    
    // Create test markers for first 3 sites
    const testMarkers = sites.slice(0, 3).map((site, index) => ({
      siteId: site.id,
      x: 100 + (index * 50),
      y: 200 + (index * 30),
    }));
    
    const result = await db.saveSiteMarkers(testMarkers);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.count).toBe(testMarkers.length);
    
    // Verify markers were saved
    for (const marker of testMarkers) {
      const site = await db.getSiteById(marker.siteId);
      expect(site.mapMarkerX).toBe(marker.x);
      expect(site.mapMarkerY).toBe(marker.y);
    }
  });

  it("should update existing markers when saving new positions", async () => {
    // Get a test site
    const centres = await db.getShoppingCentresByState("NSW");
    const centre = centres[0];
    const sites = await db.getSitesByCentreId(centre.id);
    expect(sites.length).toBeGreaterThan(0);
    
    const testSite = sites[0];
    
    // Save initial marker
    await db.saveSiteMarkers([{ siteId: testSite.id, x: 100, y: 200 }]);
    
    let site = await db.getSiteById(testSite.id);
    expect(site.mapMarkerX).toBe(100);
    expect(site.mapMarkerY).toBe(200);
    
    // Update marker position
    await db.saveSiteMarkers([{ siteId: testSite.id, x: 150, y: 250 }]);
    
    site = await db.getSiteById(testSite.id);
    expect(site.mapMarkerX).toBe(150);
    expect(site.mapMarkerY).toBe(250);
  });

  it("should handle multiple markers in a single save operation", async () => {
    const centres = await db.getShoppingCentresByState("NSW");
    const centre = centres.find(c => c.name === "Highlands Marketplace");
    expect(centre).toBeDefined();
    
    const sites = await db.getSitesByCentreId(centre!.id);
    expect(sites.length).toBeGreaterThan(2);
    
    // Save markers for multiple sites at once
    const markers = [
      { siteId: sites[0].id, x: 50, y: 100 },
      { siteId: sites[1].id, x: 200, y: 150 },
      { siteId: sites[2].id, x: 350, y: 200 },
    ];
    
    const result = await db.saveSiteMarkers(markers);
    
    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
    
    // Verify all markers were saved correctly
    for (const marker of markers) {
      const site = await db.getSiteById(marker.siteId);
      expect(site.mapMarkerX).toBe(marker.x);
      expect(site.mapMarkerY).toBe(marker.y);
    }
  });

  it("should retrieve sites with marker coordinates", async () => {
    const centres = await db.getShoppingCentresByState("NSW");
    const centre = centres[0];
    
    // Get sites for this centre
    const sites = await db.getSitesByCentreId(centre.id);
    expect(sites.length).toBeGreaterThan(0);
    
    // Check that marker fields exist (may be null if not set)
    sites.forEach(site => {
      expect(site).toHaveProperty("mapMarkerX");
      expect(site).toHaveProperty("mapMarkerY");
      
      // If markers are set, they should be numbers
      if (site.mapMarkerX !== null) {
        expect(typeof site.mapMarkerX).toBe("number");
      }
      if (site.mapMarkerY !== null) {
        expect(typeof site.mapMarkerY).toBe("number");
      }
    });
  });
});
