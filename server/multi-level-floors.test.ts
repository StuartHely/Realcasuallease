import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Multi-Level Floor Plans", () => {
  let testCentreId: number;
  let floorLevel1Id: number;
  let floorLevel2Id: number;

  beforeAll(async () => {
    // Get Carnes Hill Marketplace for testing
    const centres = await db.getShoppingCentres();
    const carnesHill = centres.find((c: any) => c.name.includes("Carnes Hill"));
    if (!carnesHill) {
      throw new Error("Carnes Hill Marketplace not found for testing");
    }
    testCentreId = carnesHill.id;
  });

  describe("Floor Level Creation", () => {
    it("should create a ground floor level", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "owner_super_admin" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.admin.createFloorLevel({
        centreId: testCentreId,
        levelName: "Ground Floor",
        levelNumber: 0,
        displayOrder: 0,
      });

      expect(result).toBeDefined();
      floorLevel1Id = result.insertId;
    });

    it("should create a level 1 floor", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "owner_super_admin" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.admin.createFloorLevel({
        centreId: testCentreId,
        levelName: "Level 1",
        levelNumber: 1,
        displayOrder: 1,
      });

      expect(result).toBeDefined();
      floorLevel2Id = result.insertId;
    });
  });

  describe("Floor Level Retrieval", () => {
    it("should retrieve all floor levels for a centre", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "owner_super_admin" },
        req: {} as any,
        res: {} as any,
      });

      const floors = await caller.admin.getFloorLevels({
        centreId: testCentreId,
      });

      expect(floors).toBeDefined();
      expect(floors.length).toBeGreaterThanOrEqual(2);
      expect(floors[0].levelName).toBe("Ground Floor");
      expect(floors[1].levelName).toBe("Level 1");
    });

    it("should return floors in display order", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "owner_super_admin" },
        req: {} as any,
        res: {} as any,
      });

      const floors = await caller.admin.getFloorLevels({
        centreId: testCentreId,
      });

      // Check that floors are ordered by displayOrder
      for (let i = 0; i < floors.length - 1; i++) {
        expect(floors[i].displayOrder).toBeLessThanOrEqual(
          floors[i + 1].displayOrder
        );
      }
    });
  });

  describe("Floor Level Map Upload", () => {
    it("should upload a map for a specific floor level", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "owner_super_admin" },
        req: {} as any,
        res: {} as any,
      });

      // Create a small test image (1x1 PNG)
      const testImageBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const result = await caller.admin.uploadFloorLevelMap({
        floorLevelId: floorLevel1Id,
        imageData: testImageBase64,
        fileName: "ground-floor.png",
      });

      expect(result).toBeDefined();
      expect(result.mapUrl).toContain("https://");
      expect(result.mapUrl).toContain(".png");
    });
  });

  describe("Sites by Floor Level", () => {
    it("should return empty array for floor with no sites assigned", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "owner_super_admin" },
        req: {} as any,
        res: {} as any,
      });

      const sites = await caller.admin.getSitesByFloorLevel({
        floorLevelId: floorLevel1Id,
      });

      expect(sites).toBeDefined();
      expect(Array.isArray(sites)).toBe(true);
      // Initially no sites assigned to floor levels
      expect(sites.length).toBe(0);
    });
  });

  describe("Database Schema Validation", () => {
    it("should have floorLevelId column in sites table", async () => {
      const sites = await db.getAllSites();
      
      // Check that sites have floorLevelId property (even if null)
      if (sites.length > 0) {
        expect(sites[0]).toHaveProperty("floorLevelId");
      }
    });

    it("should allow null floorLevelId for single-level centres", async () => {
      const sites = await db.getSitesByCentreId(testCentreId);
      
      // Existing sites should have null floorLevelId (backward compatibility)
      const sitesWithNullFloor = sites.filter((s: any) => s.floorLevelId === null);
      expect(sitesWithNullFloor.length).toBeGreaterThan(0);
    });
  });

  describe("Admin Authorization", () => {
    it("should reject floor level creation for non-admin users", async () => {
      const caller = appRouter.createCaller({
        user: { id: 2, role: "customer" },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.admin.createFloorLevel({
          centreId: testCentreId,
          levelName: "Level 2",
          levelNumber: 2,
          displayOrder: 2,
        })
      ).rejects.toThrow();
    });

    it("should reject floor level map upload for non-admin users", async () => {
      const caller = appRouter.createCaller({
        user: { id: 2, role: "customer" },
        req: {} as any,
        res: {} as any,
      });

      const testImageBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      await expect(
        caller.admin.uploadFloorLevelMap({
          floorLevelId: floorLevel1Id,
          imageData: testImageBase64,
          fileName: "test.png",
        })
      ).rejects.toThrow();
    });
  });

  describe("Multi-Level Centre Detection", () => {
    it("should identify centres with multiple floor levels", async () => {
      const floors = await db.getFloorLevelsByCentre(testCentreId);
      
      const isMultiLevel = floors.length > 0;
      expect(isMultiLevel).toBe(true);
      expect(floors.length).toBeGreaterThanOrEqual(2);
    });

    it("should maintain backward compatibility for single-level centres", async () => {
      // Get a centre that doesn't have floor levels
      const centres = await db.getShoppingCentres();
      const singleLevelCentre = centres.find((c: any) => 
        !c.name.includes("Carnes Hill")
      );

      if (singleLevelCentre) {
        const floors = await db.getFloorLevelsByCentre(singleLevelCentre.id);
        expect(floors.length).toBe(0);
        
        // Should still have mapImageUrl on the centre itself
        expect(singleLevelCentre).toHaveProperty("mapImageUrl");
      }
    });
  });
});
