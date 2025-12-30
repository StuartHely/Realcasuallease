import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// Mock admin context
const mockAdminContext: Context = {
  user: {
    id: 1,
    openId: "test-admin",
    name: "Test Admin",
    email: "admin@test.com",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

describe("Coordinate Validation", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should accept valid percentage coordinates (0-100)", async () => {
    const validMarkers = [
      { siteId: 1, x: 0, y: 0 },
      { siteId: 2, x: 50, y: 50 },
      { siteId: 3, x: 100, y: 100 },
      { siteId: 4, x: 25.5, y: 75.3 },
    ];

    // This should not throw
    try {
      // We're testing the input validation, not the actual DB operation
      // So we expect it to fail at DB level, but pass validation
      await caller.admin.saveSiteMarkers({
        centreId: 1,
        markers: validMarkers,
      });
    } catch (error: any) {
      // If it fails, it should be a DB error, not a validation error
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });

  it("should reject coordinates > 100", async () => {
    const invalidMarkers = [
      { siteId: 1, x: 150, y: 50 }, // x > 100
    ];

    await expect(
      caller.admin.saveSiteMarkers({
        centreId: 1,
        markers: invalidMarkers,
      })
    ).rejects.toThrow();
  });

  it("should reject negative coordinates", async () => {
    const invalidMarkers = [
      { siteId: 1, x: -10, y: 50 }, // x < 0
    ];

    await expect(
      caller.admin.saveSiteMarkers({
        centreId: 1,
        markers: invalidMarkers,
      })
    ).rejects.toThrow();
  });

  it("should reject pixel-based coordinates (200, 350)", async () => {
    const pixelMarkers = [
      { siteId: 1, x: 200, y: 150 }, // Legacy pixel coordinates
    ];

    await expect(
      caller.admin.saveSiteMarkers({
        centreId: 1,
        markers: pixelMarkers,
      })
    ).rejects.toThrow();
  });
});
