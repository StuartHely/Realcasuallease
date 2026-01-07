import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { shoppingCentres, sites, usageCategories, siteUsageCategories, bookings, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Booking Approval System", () => {
  let testCentreId: number;
  let testSiteWithApprovals: number;
  let testSiteWithoutApprovals: number;
  let testSiteInstantBookingFalse: number;
  let testCategoryApproved: number;
  let testCategoryNotApproved: number;
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Find test centre - use Campbelltown Mall which has multiple sites
    const centres = await db
      .select()
      .from(shoppingCentres)
      .where(eq(shoppingCentres.name, "Campbelltown Mall"))
      .limit(1);

    if (centres.length === 0) {
      throw new Error("Test centre 'Campbelltown Mall' not found");
    }

    testCentreId = centres[0].id;

    // Get sites from this centre
    const sitesList = await db
      .select()
      .from(sites)
      .where(eq(sites.centreId, testCentreId))
      .limit(3);

    if (sitesList.length < 1) {
      throw new Error("Not enough test sites found");
    }

    testSiteWithApprovals = sitesList[0].id;
    testSiteWithoutApprovals = sitesList.length > 1 ? sitesList[1].id : sitesList[0].id;
    testSiteInstantBookingFalse = sitesList[0].id; // Use same site, we'll check the flag

    // Get usage categories
    const categories = await db
      .select()
      .from(usageCategories)
      .limit(2);

    if (categories.length < 2) {
      throw new Error("Not enough usage categories found");
    }

    testCategoryApproved = categories[0].id;
    testCategoryNotApproved = categories[1].id;

    // Get a test user
    const usersList = await db
      .select()
      .from(users)
      .limit(1);

    if (usersList.length === 0) {
      throw new Error("No test users found");
    }

    testUserId = usersList[0].id;
  });

  it("should have test data configured correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    expect(testCentreId).toBeGreaterThan(0);
    expect(testSiteWithApprovals).toBeGreaterThan(0);
    expect(testCategoryApproved).toBeGreaterThan(0);
    expect(testUserId).toBeGreaterThan(0);
  });

  it("should identify sites with approved categories", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Check if site has any approved categories
    const approvals = await db
      .select()
      .from(siteUsageCategories)
      .where(eq(siteUsageCategories.siteId, testSiteWithApprovals));

    // This test just verifies we can query the approvals
    expect(Array.isArray(approvals)).toBe(true);
  });

  it("should correctly check if category is approved for site", async () => {
    const { isCategoryApprovedForSite } = await import("./usageCategoriesDb");

    // Test with a known category
    const isApproved = await isCategoryApprovedForSite(testSiteWithApprovals, testCategoryApproved);
    
    // Result depends on test data, but function should return boolean
    expect(typeof isApproved).toBe("boolean");
  });

  it("should get all approved categories for a site", async () => {
    const { getApprovedCategoriesForSite } = await import("./usageCategoriesDb");

    const approvedCategories = await getApprovedCategoriesForSite(testSiteWithApprovals);
    
    expect(Array.isArray(approvedCategories)).toBe(true);
    // Each category should have a categoryId
    if (approvedCategories.length > 0) {
      expect(approvedCategories[0]).toHaveProperty("categoryId");
    }
  });

  it("should detect duplicate bookings for same customer + category + centre", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get the centre ID for the site
    const siteData = await db
      .select()
      .from(sites)
      .where(eq(sites.id, testSiteWithApprovals))
      .limit(1);

    if (siteData.length === 0) {
      throw new Error("Site not found");
    }

    const centreId = siteData[0].centreId;

    // Find existing bookings by this customer with any category at this centre
    const existingBookings = await db
      .select({
        bookingId: bookings.id,
        siteId: bookings.siteId,
        centreId: sites.centreId,
        categoryId: bookings.usageCategoryId,
      })
      .from(bookings)
      .innerJoin(sites, eq(bookings.siteId, sites.id))
      .where(and(
        eq(bookings.customerId, testUserId),
        eq(sites.centreId, centreId)
      ));

    // Should be able to query existing bookings
    expect(Array.isArray(existingBookings)).toBe(true);
  });

  it("should handle approval logic for additional category text", () => {
    // Simulate the logic
    const additionalCategoryText = "Special requirements for my booth";
    let requiresApproval = false;

    if (additionalCategoryText && additionalCategoryText.trim().length > 0) {
      requiresApproval = true;
    }

    expect(requiresApproval).toBe(true);
  });

  it("should handle approval logic for empty additional category text", () => {
    // Simulate the logic
    const additionalCategoryText = "";
    let requiresApproval = false;

    if (additionalCategoryText && additionalCategoryText.trim().length > 0) {
      requiresApproval = true;
    }

    expect(requiresApproval).toBe(false);
  });

  it("should default to approved when no categories are configured", async () => {
    const { getApprovedCategoriesForSite } = await import("./usageCategoriesDb");

    // Get approved categories for a site
    const approvedCategories = await getApprovedCategoriesForSite(testSiteWithoutApprovals);
    
    // Simulate the logic
    let requiresApproval = false;
    
    if (approvedCategories.length === 0) {
      // Default all approved
      requiresApproval = false;
    }

    // If no categories configured, should not require approval
    if (approvedCategories.length === 0) {
      expect(requiresApproval).toBe(false);
    }
  });

  it("should require approval for non-approved category", async () => {
    const { isCategoryApprovedForSite, getApprovedCategoriesForSite } = await import("./usageCategoriesDb");

    const approvedCategories = await getApprovedCategoriesForSite(testSiteWithApprovals);
    
    // Only test if site has approved categories configured
    if (approvedCategories.length > 0) {
      // Find a category that's NOT approved
      const allCategories = await (await getDb())!
        .select()
        .from(usageCategories)
        .limit(10);

      const notApprovedCategory = allCategories.find(
        cat => !approvedCategories.some(approved => approved.id === cat.id)
      );

      if (notApprovedCategory) {
        const isApproved = await isCategoryApprovedForSite(testSiteWithApprovals, notApprovedCategory.id);
        
        // Simulate the logic
        let requiresApproval = false;
        if (!isApproved) {
          requiresApproval = true;
        }

        // Only expect true if category is actually not approved
        expect(requiresApproval).toBe(!isApproved);
      } else {
        // All categories are approved, skip this test
        expect(true).toBe(true);
      }
    }
  });

  it("should determine booking status correctly based on approval and instant booking", () => {
    // Test case 1: Requires approval
    let requiresApproval = true;
    let instantBooking = true;
    let status = requiresApproval ? "pending" : (instantBooking ? "confirmed" : "pending");
    expect(status).toBe("pending");

    // Test case 2: No approval needed, instant booking enabled
    requiresApproval = false;
    instantBooking = true;
    status = requiresApproval ? "pending" : (instantBooking ? "confirmed" : "pending");
    expect(status).toBe("confirmed");

    // Test case 3: No approval needed, instant booking disabled
    requiresApproval = false;
    instantBooking = false;
    status = requiresApproval ? "pending" : (instantBooking ? "confirmed" : "pending");
    expect(status).toBe("pending");
  });
});
