import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, shoppingCentres, sites, usageCategories, owners } from "../drizzle/schema";

describe("Usage Categories - New Features", () => {
  let adminCaller: any;
  let testCentreId: number;
  let testSiteId1: number;
  let testSiteId2: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create admin user with unique openId
    const timestamp = Date.now();
    const openId = `test-admin-cat-new-${timestamp}`;
    const adminResult = await db.insert(users).values({
      openId,
      name: "Admin User",
      email: `admin-cat-new-${timestamp}@test.com`,
      role: "mega_admin",
      createdAt: new Date(),
    });
    const adminId = Number(adminResult[0].insertId);

    // Create admin caller
    adminCaller = appRouter.createCaller({
      user: { id: adminId, openId, name: "Admin User", email: `admin-cat-new-${timestamp}@test.com`, role: "mega_admin" },
    });

    // Create test owner
    const ownerResult = await db.insert(owners).values({
      name: "Test Owner for New Features",
      email: `owner-new-${timestamp}@test.com`,
      phone: "1234567890",
      commissionPercentage: "10",
      monthlyFee: "100",
      remittanceOption: "per_booking",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const testOwnerId = Number(ownerResult[0].insertId);

    // Create test centre
    const centreResult = await db.insert(shoppingCentres).values({
      ownerId: testOwnerId,
      name: "Test Centre for New Features",
      address: "123 Test St",
      state: "NSW",
      postcode: "2000",
      description: "Test centre",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testCentreId = Number(centreResult[0].insertId);

    // Create two test sites
    const site1Result = await db.insert(sites).values({
      centreId: testCentreId,
      siteNumber: "TEST-NEW-1",
      description: "Test Site 1 for New Features",
      size: "3x4m",
      pricePerDay: "100",
      weeklyRate: "600",
      instantBooking: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testSiteId1 = Number(site1Result[0].insertId);

    const site2Result = await db.insert(sites).values({
      centreId: testCentreId,
      siteNumber: "TEST-NEW-2",
      description: "Test Site 2 for New Features",
      size: "3x4m",
      pricePerDay: "100",
      weeklyRate: "600",
      instantBooking: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testSiteId2 = Number(site2Result[0].insertId);
  });

  describe("Create New Category", () => {
    it("should allow admin to create a new custom category", async () => {
      const result = await adminCaller.usageCategories.createCategory({
        name: "Test Custom Category",
        isFree: false,
        displayOrder: 100,
      });

      expect(result.success).toBe(true);
      expect(result.categoryId).toBeDefined();
      expect(typeof result.categoryId).toBe("number");
    });

    it("should allow admin to create a free category", async () => {
      const result = await adminCaller.usageCategories.createCategory({
        name: "Test Free Category",
        isFree: true,
        displayOrder: 101,
      });

      expect(result.success).toBe(true);
      expect(result.categoryId).toBeDefined();

      // Verify it appears in the list
      const categories = await adminCaller.usageCategories.list();
      const createdCategory = categories.find((c: any) => c.id === result.categoryId);
      expect(createdCategory).toBeDefined();
      expect(createdCategory.isFree).toBe(true);
    });

    it("should include new category in list query", async () => {
      const beforeCount = (await adminCaller.usageCategories.list()).length;

      await adminCaller.usageCategories.createCategory({
        name: "Another Test Category",
        isFree: false,
        displayOrder: 102,
      });

      const afterCount = (await adminCaller.usageCategories.list()).length;
      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe("Apply to All Sites in Centre", () => {
    it("should apply category approvals to all sites in a centre", async () => {
      // Get a few category IDs
      const categories = await adminCaller.usageCategories.list();
      const categoryIds = categories.slice(0, 3).map((c: any) => c.id);

      // Apply to all sites in the centre
      const result = await adminCaller.usageCategories.applyToAllSites({
        centreId: testCentreId,
        categoryIds,
      });

      expect(result.success).toBe(true);
      expect(result.sitesUpdated).toBe(2); // We created 2 sites

      // Verify both sites have the same approvals
      const site1Approvals = await adminCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId1,
      });
      const site2Approvals = await adminCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId2,
      });

      expect(site1Approvals.length).toBe(3);
      expect(site2Approvals.length).toBe(3);

      const site1Ids = site1Approvals.map((a: any) => a.categoryId).sort();
      const site2Ids = site2Approvals.map((a: any) => a.categoryId).sort();
      expect(site1Ids).toEqual(site2Ids);
    });

    it("should replace existing approvals when applying to all sites", async () => {
      const categories = await adminCaller.usageCategories.list();

      // Set different approvals for site 1
      const initialCategoryIds = categories.slice(0, 2).map((c: any) => c.id);
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId1,
        categoryIds: initialCategoryIds,
      });

      // Apply different approvals to all sites
      const newCategoryIds = categories.slice(5, 8).map((c: any) => c.id);
      await adminCaller.usageCategories.applyToAllSites({
        centreId: testCentreId,
        categoryIds: newCategoryIds,
      });

      // Verify site 1's approvals were replaced
      const site1Approvals = await adminCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId1,
      });

      const site1Ids = site1Approvals.map((a: any) => a.categoryId).sort();
      expect(site1Ids).toEqual(newCategoryIds.sort());
    });

    it("should handle empty category list (clear all approvals)", async () => {
      // Apply empty list to all sites
      const result = await adminCaller.usageCategories.applyToAllSites({
        centreId: testCentreId,
        categoryIds: [],
      });

      expect(result.success).toBe(true);

      // Verify both sites have no approvals
      const site1Approvals = await adminCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId1,
      });
      const site2Approvals = await adminCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId2,
      });

      expect(site1Approvals.length).toBe(0);
      expect(site2Approvals.length).toBe(0);
    });
  });

  describe("Category List Correctness", () => {
    it("should only return active categories", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all categories including inactive
      const allCategories = await db.select().from(usageCategories);
      const activeCategories = await adminCaller.usageCategories.list();

      // Active count should be less than or equal to total
      expect(activeCategories.length).toBeLessThanOrEqual(allCategories.length);

      // All returned categories should be active
      activeCategories.forEach((cat: any) => {
        expect(cat.isActive).toBe(true);
      });
    });

    it("should include user's 34 correct categories", async () => {
      const categories = await adminCaller.usageCategories.list();
      const categoryNames = categories.map((c: any) => c.name);

      // Check for some key categories from user's list
      expect(categoryNames).toContain("Alcohol");
      expect(categoryNames).toContain("Art & Craft");
      expect(categoryNames).toContain("Baby & Toddler");
      expect(categoryNames).toContain("Charities Free");
      expect(categoryNames).toContain("Community Groups");
      expect(categoryNames).toContain("Electrical");
      expect(categoryNames).toContain("Entertainment");
      expect(categoryNames).toContain("Government Free");
      expect(categoryNames).toContain("Music");
      expect(categoryNames).toContain("Plants");
      expect(categoryNames).toContain("Shoes");
      expect(categoryNames).toContain("Sporting Goods");
      expect(categoryNames).toContain("Tobacco");
      expect(categoryNames).toContain("Tools");
      expect(categoryNames).toContain("Wellness");

      // Check that incorrect categories are NOT present (should be inactive)
      expect(categoryNames).not.toContain("Beauty & Cosmetics");
      expect(categoryNames).not.toContain("Boating & Marine");
      expect(categoryNames).not.toContain("Vaping & Smoking");
      expect(categoryNames).not.toContain("Wine & Liquor");
    });

    it("should have exactly 2 free categories from original list", async () => {
      const categories = await adminCaller.usageCategories.list();
      const originalFreeCategories = categories.filter((c: any) => 
        c.isFree && (c.name === "Charities Free" || c.name === "Government Free")
      );

      expect(originalFreeCategories.length).toBe(2);
    });
  });
});
