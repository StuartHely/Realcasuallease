import { getDb } from "./db";
import { usageCategories, siteUsageCategories, sites } from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Get all usage categories ordered by displayOrder
 */
export async function getAllUsageCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(usageCategories)
    .where(eq(usageCategories.isActive, true))
    .orderBy(usageCategories.name);
}

/**
 * Get approved categories for a specific site (returns full category objects)
 */
export async function getApprovedCategoriesForSite(siteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select({
    id: usageCategories.id,
    name: usageCategories.name,
    isFree: usageCategories.isFree,
  })
  .from(siteUsageCategories)
  .innerJoin(usageCategories, eq(siteUsageCategories.categoryId, usageCategories.id))
  .where(eq(siteUsageCategories.siteId, siteId));
}

/**
 * Set approved categories for a site (replaces all existing)
 */
export async function setApprovedCategoriesForSite(siteId: number, categoryIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all existing approvals for this site
  await db.delete(siteUsageCategories)
    .where(eq(siteUsageCategories.siteId, siteId));
  
  // Insert new approvals
  if (categoryIds.length > 0) {
    const values = categoryIds.map(categoryId => ({
      siteId,
      categoryId,
      createdAt: new Date(),
    }));
    
    await db.insert(siteUsageCategories).values(values);
  }
  
  return true;
}

/**
 * Check if a category is approved for a site
 */
export async function isCategoryApprovedForSite(siteId: number, categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select()
    .from(siteUsageCategories)
    .where(and(
      eq(siteUsageCategories.siteId, siteId),
      eq(siteUsageCategories.categoryId, categoryId)
    ));
  
  return result.length > 0;
}

/**
 * Get all sites with their approved categories for a centre
 */
export async function getSitesWithCategoriesForCentre(centreId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const centreSites = await db.select().from(sites)
    .where(eq(sites.centreId, centreId));
  
  // Sort sites using natural/alphanumeric ordering (1, 2, 3, ... 10, 11, 12, ... 9a, VK13)
  centreSites.sort((a, b) => {
    const aNum = parseInt(a.siteNumber.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.siteNumber.replace(/\D/g, '')) || 0;
    const aHasLetter = /[a-zA-Z]/.test(a.siteNumber);
    const bHasLetter = /[a-zA-Z]/.test(b.siteNumber);
    // Pure numbers come before alphanumeric
    if (!aHasLetter && bHasLetter) return -1;
    if (aHasLetter && !bHasLetter) return 1;
    // Compare by extracted number first
    if (aNum !== bNum) return aNum - bNum;
    // If same number, compare full string
    return a.siteNumber.localeCompare(b.siteNumber);
  });
  
  const sitesWithCategories = await Promise.all(
    centreSites.map(async (site: any) => {
      const approvals = await getApprovedCategoriesForSite(site.id);
      return {
        ...site,
        approvedCategoryIds: approvals.map((a: any) => a.id),
      };
    })
  );
  
  return sitesWithCategories;
}

/**
 * Create a new usage category
 */
export async function createUsageCategory(name: string, isFree: boolean, displayOrder: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(usageCategories).values({
    name,
    isFree,
    displayOrder,
    isActive: true,
    createdAt: new Date(),
  }).returning({ id: usageCategories.id });
  
  return result.id;
}

/**
 * Apply category approvals to all sites in a centre
 */
export async function applyApprovalsToAllSitesInCentre(centreId: number, categoryIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all sites in the centre
  const centreSites = await db.select().from(sites)
    .where(eq(sites.centreId, centreId));
  
  // Apply approvals to each site
  for (const site of centreSites) {
    await setApprovedCategoriesForSite(site.id, categoryIds);
  }
  
  return centreSites.length;
}

/**
 * Get usage statistics for all categories
 * Returns count of sites and bookings using each category
 */
export async function getCategoryUsageStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all active categories
  const categories = await db.select().from(usageCategories)
    .where(eq(usageCategories.isActive, true))
    .orderBy(usageCategories.name);
  
  // Get site counts for each category
  const siteCountsResult = await db.execute(`
    SELECT categoryId, COUNT(DISTINCT siteId) as site_count
    FROM site_usage_categories
    GROUP BY categoryId
  `);
  
  // Get booking counts for each category (from bookings table using usageCategoryId field)
  const bookingCountsResult = await db.execute(`
    SELECT usageCategoryId as category_id, COUNT(*) as booking_count
    FROM bookings
    WHERE usageCategoryId IS NOT NULL
    GROUP BY usageCategoryId
  `);
  
  // Build a map of category_id -> site_count
  const siteCounts = new Map<number, number>();
  const siteRows = (siteCountsResult as unknown as [any[], any])[0];
  for (const row of siteRows) {
    siteCounts.set(row.categoryId, Number(row.site_count));
  }
  
  // Build a map of category_id -> booking_count
  const bookingCounts = new Map<number, number>();
  const bookingRows = (bookingCountsResult as unknown as [any[], any])[0];
  for (const row of bookingRows) {
    bookingCounts.set(row.category_id, Number(row.booking_count));
  }
  
  // Combine data
  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    isFree: cat.isFree,
    siteCount: siteCounts.get(cat.id) || 0,
    bookingCount: bookingCounts.get(cat.id) || 0,
  }));
}
