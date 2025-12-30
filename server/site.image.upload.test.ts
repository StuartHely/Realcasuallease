import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import * as fs from "fs";
import * as path from "path";

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

describe("Site Image Upload", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should validate image slot number (1-4)", async () => {
    const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // Test invalid slot (0)
    await expect(
      caller.admin.uploadSiteImage({
        siteId: 1,
        imageSlot: 0,
        base64Image,
      })
    ).rejects.toThrow();

    // Test invalid slot (5)
    await expect(
      caller.admin.uploadSiteImage({
        siteId: 1,
        imageSlot: 5,
        base64Image,
      })
    ).rejects.toThrow();
  });

  it("should accept valid image slot numbers (1-4)", async () => {
    const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // These should pass validation (but may fail at DB level if site doesn't exist)
    for (let slot = 1; slot <= 4; slot++) {
      try {
        await caller.admin.uploadSiteImage({
          siteId: 999999, // Non-existent site
          imageSlot: slot,
          base64Image,
        });
      } catch (error: any) {
        // Should fail at DB level, not validation level
        expect(error.code).not.toBe("BAD_REQUEST");
      }
    }
  });

  it("should process image with sharp (resize and convert to WebP)", async () => {
    // Create a small test PNG image (1x1 pixel)
    const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const { processSiteImage } = await import("./imageProcessing");

    const result = await processSiteImage(base64Image, 1, 1);

    // Should return a URL
    expect(result.url).toBeDefined();
    expect(typeof result.url).toBe("string");
    expect(result.url.length).toBeGreaterThan(0);
  });

  it("should handle base64 images with and without data URI prefix", async () => {
    const { processSiteImage } = await import("./imageProcessing");

    // With data URI prefix
    const withPrefix = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const result1 = await processSiteImage(withPrefix, 1, 1);
    expect(result1.url).toBeDefined();

    // Without data URI prefix
    const withoutPrefix = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const result2 = await processSiteImage(withoutPrefix, 1, 1);
    expect(result2.url).toBeDefined();
  });
});
