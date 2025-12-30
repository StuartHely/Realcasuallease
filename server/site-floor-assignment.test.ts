import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Site Floor Assignment', () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let testCentreId: number;
  let testFloorLevel1Id: number;
  let testFloorLevel2Id: number;
  let testSiteIds: number[];

  beforeAll(async () => {
    // Create admin caller
    adminCaller = appRouter.createCaller({
      user: { id: 1, openId: 'test-admin', role: 'mega_admin', name: 'Test Admin' },
      req: {} as any,
      res: {} as any,
    });

    // Get a test centre (Campbelltown Mall)
    const centres = await db.getShoppingCentres();
    const campbelltownMall = centres.find(c => c.name.includes('Campbelltown'));
    
    if (!campbelltownMall) {
      throw new Error('Campbelltown Mall not found for testing');
    }
    
    testCentreId = campbelltownMall.id;

    // Get existing floor levels or create them
    const existingFloors = await adminCaller.admin.getFloorLevels({ centreId: testCentreId });
    
    if (existingFloors.length >= 2) {
      // Use existing floors
      testFloorLevel1Id = existingFloors[0].id;
      testFloorLevel2Id = existingFloors[1].id;
    } else {
      // Create test floor levels
      const floor1 = await db.createFloorLevel({
        centreId: testCentreId,
        levelName: 'Test Lower Level',
        levelNumber: 1,
        displayOrder: 1,
      });
      testFloorLevel1Id = floor1.id;

      const floor2 = await db.createFloorLevel({
        centreId: testCentreId,
        levelName: 'Test Upper Level',
        levelNumber: 2,
        displayOrder: 2,
      });
      testFloorLevel2Id = floor2.id;
    }

    // Get sites for this centre
    const sites = await db.getSitesByCentreId(testCentreId);
    testSiteIds = sites.slice(0, 4).map(s => s.id); // Use first 4 sites for testing
  });

  it('should update site floor assignments successfully', async () => {
    // Assign first 2 sites to floor 1, next 2 to floor 2
    const result = await adminCaller.admin.updateSiteFloorAssignment({
      assignments: [
        { siteId: testSiteIds[0], floorLevelId: testFloorLevel1Id },
        { siteId: testSiteIds[1], floorLevelId: testFloorLevel1Id },
        { siteId: testSiteIds[2], floorLevelId: testFloorLevel2Id },
        { siteId: testSiteIds[3], floorLevelId: testFloorLevel2Id },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(4);
  });

  it('should filter sites by floor level correctly', async () => {
    // Get sites for floor 1
    const floor1Sites = await adminCaller.admin.getSitesByFloorLevel({
      floorLevelId: testFloorLevel1Id,
    });

    expect(floor1Sites.length).toBeGreaterThanOrEqual(2);
    expect(floor1Sites.every(s => s.floorLevelId === testFloorLevel1Id)).toBe(true);
  });

  it('should filter sites for floor 2 correctly', async () => {
    // Get sites for floor 2
    const floor2Sites = await adminCaller.admin.getSitesByFloorLevel({
      floorLevelId: testFloorLevel2Id,
    });

    expect(floor2Sites.length).toBeGreaterThanOrEqual(2);
    expect(floor2Sites.every(s => s.floorLevelId === testFloorLevel2Id)).toBe(true);
  });

  it('should allow unassigning sites from floor levels', async () => {
    // Unassign first site
    const result = await adminCaller.admin.updateSiteFloorAssignment({
      assignments: [
        { siteId: testSiteIds[0], floorLevelId: null },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);

    // Verify site is unassigned
    const sites = await db.getSitesByCentreId(testCentreId);
    const unassignedSite = sites.find(s => s.id === testSiteIds[0]);
    expect(unassignedSite?.floorLevelId).toBeNull();
  });

  it('should handle bulk assignment updates', async () => {
    // Reassign all test sites to floor 1
    const result = await adminCaller.admin.updateSiteFloorAssignment({
      assignments: testSiteIds.map(siteId => ({
        siteId,
        floorLevelId: testFloorLevel1Id,
      })),
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(testSiteIds.length);

    // Verify all are on floor 1
    const floor1Sites = await adminCaller.admin.getSitesByFloorLevel({
      floorLevelId: testFloorLevel1Id,
    });

    const assignedSiteIds = floor1Sites.map(s => s.id);
    testSiteIds.forEach(id => {
      expect(assignedSiteIds).toContain(id);
    });
  });

  it('should require admin role for site assignment', async () => {
    const customerCaller = appRouter.createCaller({
      user: { id: 2, openId: 'test-customer', role: 'customer', name: 'Test Customer' },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      customerCaller.admin.updateSiteFloorAssignment({
        assignments: [{ siteId: testSiteIds[0], floorLevelId: testFloorLevel1Id }],
      })
    ).rejects.toThrow('Admin access required');
  });

  it('should handle empty assignment array', async () => {
    const result = await adminCaller.admin.updateSiteFloorAssignment({
      assignments: [],
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(0);
  });
});
