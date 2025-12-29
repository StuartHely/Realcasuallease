import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

function createCaller(ctx: any) {
  return appRouter.createCaller(ctx);
}

describe('Interactive Map Features', () => {
  let caller: ReturnType<typeof createCaller>;
  let testCentreId: number;

  beforeAll(async () => {
    caller = createCaller({ user: null });
    
    // Get Carnes Hill Marketplace ID
    const centres = await db.getShoppingCentres();
    const carnesHill = centres.find(c => c.name.includes('Carnes Hill'));
    if (!carnesHill) throw new Error('Carnes Hill Marketplace not found');
    testCentreId = carnesHill.id;
  });

  describe('Centre Map Display', () => {
    it('should return centre with map URL', async () => {
      const centre = await caller.centres.getById({ id: testCentreId });
      
      expect(centre).toBeDefined();
      expect(centre.mapImageUrl).toBeDefined();
      expect(centre.mapImageUrl).toContain('cloudfront.net');
    });

    it('should return sites with marker coordinates', async () => {
      const sites = await caller.centres.getSites({ centreId: testCentreId });
      
      expect(sites.length).toBeGreaterThan(0);
      
      // All sites should have marker positions
      const sitesWithMarkers = sites.filter(
        s => s.mapMarkerX !== null && s.mapMarkerY !== null
      );
      expect(sitesWithMarkers.length).toBe(sites.length);
    });

    it('should have valid marker coordinates within image bounds', async () => {
      const sites = await caller.centres.getSites({ centreId: testCentreId });
      
      // Carnes Hill map dimensions: 646 x 382
      const MAX_X = 646;
      const MAX_Y = 382;
      
      sites.forEach(site => {
        expect(site.mapMarkerX).toBeGreaterThanOrEqual(0);
        expect(site.mapMarkerX).toBeLessThanOrEqual(MAX_X);
        expect(site.mapMarkerY).toBeGreaterThanOrEqual(0);
        expect(site.mapMarkerY).toBeLessThanOrEqual(MAX_Y);
      });
    });
  });

  describe('Marker Click Navigation', () => {
    it('should return site details for marker click', async () => {
      const sites = await caller.centres.getSites({ centreId: testCentreId });
      const firstSite = sites[0];
      
      const siteDetail = await caller.sites.getById({ id: firstSite.id });
      
      expect(siteDetail).toBeDefined();
      expect(siteDetail.id).toBe(firstSite.id);
      expect(siteDetail.siteNumber).toBeDefined();
      expect(siteDetail.pricePerDay).toBeDefined();
      expect(siteDetail.pricePerWeek).toBeDefined();
    });
  });

  describe('Tooltip Data', () => {
    it('should return complete site info for tooltips', async () => {
      const sites = await caller.centres.getSites({ centreId: testCentreId });
      
      sites.forEach(site => {
        // Required fields for tooltip display
        expect(site.siteNumber).toBeDefined();
        expect(site.description).toBeDefined();
        expect(site.size).toBeDefined();
        expect(site.pricePerDay).toBeDefined();
        expect(site.pricePerWeek).toBeDefined();
        
        // Verify pricing is numeric
        expect(typeof site.pricePerDay).toBe('string');
        expect(typeof site.pricePerWeek).toBe('string');
        expect(parseFloat(site.pricePerDay)).toBeGreaterThan(0);
        expect(parseFloat(site.pricePerWeek)).toBeGreaterThan(0);
      });
    });

    it('should handle sites without images gracefully', async () => {
      const sites = await caller.centres.getSites({ centreId: testCentreId });
      
      // Some sites may not have images yet
      const sitesWithoutImages = sites.filter(s => !s.imageUrl1);
      
      // Should still have all other required fields
      sitesWithoutImages.forEach(site => {
        expect(site.siteNumber).toBeDefined();
        expect(site.description).toBeDefined();
        expect(site.pricePerDay).toBeDefined();
        expect(site.pricePerWeek).toBeDefined();
      });
    });
  });

  describe('Map Fallback', () => {
    it('should handle centres without maps', async () => {
      const centres = await db.getShoppingCentres();
      
      // Find a centre without a map
      const centreWithoutMap = centres.find(c => !c.mapImageUrl);
      
      if (centreWithoutMap) {
        const centre = await caller.centres.getById({ id: centreWithoutMap.id });
        expect(centre.mapImageUrl).toBeNull();
        
        // Should still return sites
        const sites = await caller.centres.getSites({ centreId: centreWithoutMap.id });
        expect(sites).toBeDefined();
      }
    });
  });

  describe('Admin Map Management', () => {
    it('should verify map data exists in database', async () => {
      const centre = await db.getShoppingCentreById(testCentreId);
      
      expect(centre).toBeDefined();
      expect(centre?.mapImageUrl).toBeDefined();
      expect(centre?.mapImageUrl).toContain('cloudfront.net');
    });

    it('should verify marker positions are saved', async () => {
      const sites = await db.getSitesByCentreId(testCentreId);
      
      expect(sites.length).toBeGreaterThan(0);
      
      // All sites should have marker positions
      sites.forEach(site => {
        expect(site.mapMarkerX).toBeDefined();
        expect(site.mapMarkerY).toBeDefined();
        expect(site.mapMarkerX).toBeGreaterThan(0);
        expect(site.mapMarkerY).toBeGreaterThan(0);
      });
    });
  });

  describe('State-Based Browsing', () => {
    it('should filter centres by state', async () => {
      const nswCentres = await caller.centres.getByState({ state: 'NSW' });
      
      expect(nswCentres.length).toBeGreaterThan(0);
      nswCentres.forEach(centre => {
        expect(centre.state).toBe('NSW');
      });
    });

    it('should return centres for all Australian states', async () => {
      const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
      
      for (const state of states) {
        const centres = await caller.centres.getByState({ state });
        expect(Array.isArray(centres)).toBe(true);
      }
    });
  });

  describe('Centre Detail Page', () => {
    it('should return full centre details including address', async () => {
      const centre = await caller.centres.getById({ id: testCentreId });
      
      expect(centre.name).toBeDefined();
      expect(centre.address).toBeDefined();
      expect(centre.suburb).toBeDefined();
      expect(centre.state).toBeDefined();
      expect(centre.postcode).toBeDefined();
    });
  })
});
