import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import { usageCategories, siteUsageCategories, bookings, sites, shoppingCentres, owners, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Usage Categories System", () => {
  let adminCaller: any;
  let customerCaller: any;
  let testCentreId: number;
  let testSiteId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create admin caller
    const adminCtx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-admin",
        name: "Test Admin",
        email: "admin@test.com",
        role: "mega_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as any,
      res: {} as any,
    };
    adminCaller = appRouter.createCaller(adminCtx);

    // Create customer caller
    const customerCtx: TrpcContext = {
      user: {
        id: 2,
        openId: "test-customer",
        name: "Test Customer",
        email: "customer@test.com",
        role: "customer",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as any,
      res: {} as any,
    };
    customerCaller = appRouter.createCaller(customerCtx);

    // Setup test data
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test users
    await db.insert(users).values([
      {
        id: 1,
        openId: "test-admin",
        name: "Test Admin",
        email: "admin@test.com",
        role: "mega_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        openId: "test-customer",
        name: "Test Customer",
        email: "customer@test.com",
        role: "customer",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

    // Create test owner
    const ownerResult = await db.insert(owners).values({
      name: "Test Owner",
      email: "owner@test.com",
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
      name: "Test Centre for Categories",
      address: "123 Test St",
      suburb: "Test Suburb",
      city: "Test City",
      state: "NSW",
      postcode: "2000",
      ownerId: testOwnerId,
      includeInMainSite: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testCentreId = Number(centreResult[0].insertId);

    // Create test site
    const siteResult = await db.insert(sites).values({
      centreId: testCentreId,
      siteNumber: "TEST-1",
      description: "Test Site for Categories",
      size: "3x4m",
      pricePerDay: "100",
      weeklyRate: "600",
      instantBooking: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testSiteId = Number(siteResult[0].insertId);

    // Get a test category
    const categories = await db.select().from(usageCategories).limit(1);
    testCategoryId = categories[0].id;
  });

  describe("Category Listing", () => {
    it("should list all 34 usage categories", async () => {
      const categories = await adminCaller.usageCategories.list();
      
      expect(categories).toBeDefined();
      expect(categories.length).toBe(34);
      expect(categories[0]).toHaveProperty("name");
      expect(categories[0]).toHaveProperty("isFree");
      expect(categories[0]).toHaveProperty("displayOrder");
    });

    it("should include free categories (Charities and Government)", async () => {
      const categories = await adminCaller.usageCategories.list();
      
      const freeCategories = categories.filter((c: any) => c.isFree);
      expect(freeCategories.length).toBeGreaterThanOrEqual(2);
      
      const categoryNames = freeCategories.map((c: any) => c.name);
      expect(categoryNames).toContain("Charities (Free)");
      expect(categoryNames).toContain("Government (Free)");
    });

    it("should be ordered by displayOrder", async () => {
      const categories = await adminCaller.usageCategories.list();
      
      for (let i = 1; i < categories.length; i++) {
        expect(categories[i].displayOrder).toBeGreaterThanOrEqual(categories[i - 1].displayOrder);
      }
    });
  });

  describe("Admin Site Category Management", () => {
    it("should allow admin to set approved categories for a site", async () => {
      const result = await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [testCategoryId],
      });
      
      expect(result.success).toBe(true);
    });

    it("should retrieve approved categories for a site", async () => {
      // First set some categories
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [testCategoryId],
      });
      
      // Then retrieve them
      const approved = await adminCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId,
      });
      
      expect(approved).toBeDefined();
      expect(approved.length).toBe(1);
      expect(approved[0].categoryId).toBe(testCategoryId);
    });

    it("should replace existing approvals when setting new ones", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const allCategories = await db.select().from(usageCategories).limit(3);
      const categoryIds = allCategories.map(c => c.id);
      
      // Set first batch
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [categoryIds[0], categoryIds[1]],
      });
      
      // Set second batch (should replace)
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [categoryIds[2]],
      });
      
      // Verify only second batch exists
      const approved = await adminCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId,
      });
      
      expect(approved.length).toBe(1);
      expect(approved[0].categoryId).toBe(categoryIds[2]);
    });

    it("should prevent non-admin from setting approved categories", async () => {
      await expect(
        customerCaller.usageCategories.setApprovedCategories({
          siteId: testSiteId,
          categoryIds: [testCategoryId],
        })
      ).rejects.toThrow();
    });

    it("should get sites with categories for a centre", async () => {
      // Set some categories first
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [testCategoryId],
      });
      
      const sitesWithCategories = await adminCaller.usageCategories.getSitesWithCategories({
        centreId: testCentreId,
      });
      
      expect(sitesWithCategories).toBeDefined();
      expect(sitesWithCategories.length).toBeGreaterThan(0);
      expect(sitesWithCategories[0]).toHaveProperty("approvedCategoryIds");
    });
  });

  describe("Booking with Usage Categories", () => {
    it("should allow booking with approved category (auto-approve)", async () => {
      // Set category as approved
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [testCategoryId],
      });
      
      // Create booking
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      const booking = await customerCaller.bookings.create({
        siteId: testSiteId,
        usageCategoryId: testCategoryId,
        startDate,
        endDate,
        tablesRequested: 0,
        chairsRequested: 0,
      });
      
      expect(booking).toBeDefined();
      expect(booking.bookingId).toBeDefined();
      expect(booking.requiresApproval).toBe(false); // Should be auto-approved
    });

    it("should require approval for non-approved category", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get a different category that's not approved
      const allCategories = await db.select().from(usageCategories).limit(5);
      const unapprovedCategory = allCategories.find(c => c.id !== testCategoryId);
      
      if (!unapprovedCategory) throw new Error("Could not find unapproved category");
      
      // Clear all approvals
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [],
      });
      
      // Try to book with unapproved category
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 40);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      const booking = await customerCaller.bookings.create({
        siteId: testSiteId,
        usageCategoryId: unapprovedCategory.id,
        startDate,
        endDate,
        tablesRequested: 0,
        chairsRequested: 0,
      });
      
      expect(booking.requiresApproval).toBe(true); // Should require approval
    });

    it("should require approval when additional text is provided", async () => {
      // Set category as approved
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [testCategoryId],
      });
      
      // Create booking with additional text
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 50);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      const booking = await customerCaller.bookings.create({
        siteId: testSiteId,
        usageCategoryId: testCategoryId,
        additionalCategoryText: "I need special permission for this",
        startDate,
        endDate,
        tablesRequested: 0,
        chairsRequested: 0,
      });
      
      expect(booking.requiresApproval).toBe(true); // Should require approval due to additional text
    });

    it("should require approval for duplicate bookings with same category", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Set category as approved
      await adminCaller.usageCategories.setApprovedCategories({
        siteId: testSiteId,
        categoryIds: [testCategoryId],
      });
      
      // Create first booking
      const startDate1 = new Date();
      startDate1.setDate(startDate1.getDate() + 60);
      const endDate1 = new Date(startDate1);
      endDate1.setDate(endDate1.getDate() + 6);
      
      await customerCaller.bookings.create({
        siteId: testSiteId,
        usageCategoryId: testCategoryId,
        startDate: startDate1,
        endDate: endDate1,
        tablesRequested: 0,
        chairsRequested: 0,
      });
      
      // Try to create second booking with same category and site (different dates)
      const startDate2 = new Date();
      startDate2.setDate(startDate2.getDate() + 70);
      const endDate2 = new Date(startDate2);
      endDate2.setDate(endDate2.getDate() + 6);
      
      const booking2 = await customerCaller.bookings.create({
        siteId: testSiteId,
        usageCategoryId: testCategoryId,
        startDate: startDate2,
        endDate: endDate2,
        tablesRequested: 0,
        chairsRequested: 0,
      });
      
      expect(booking2.requiresApproval).toBe(true); // Should require approval due to duplicate
    });
  });

  describe("Public Access", () => {
    it("should allow public access to category list", async () => {
      const publicCtx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as any,
        res: {} as any,
      };
      const publicCaller = appRouter.createCaller(publicCtx);
      
      const categories = await publicCaller.usageCategories.list();
      expect(categories).toBeDefined();
      expect(categories.length).toBe(34);
    });

    it("should allow public access to approved categories for a site", async () => {
      const publicCtx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as any,
        res: {} as any,
      };
      const publicCaller = appRouter.createCaller(publicCtx);
      
      const approved = await publicCaller.usageCategories.getApprovedForSite({
        siteId: testSiteId,
      });
      
      expect(approved).toBeDefined();
    });
  });
});
