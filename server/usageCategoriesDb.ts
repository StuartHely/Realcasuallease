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
    .orderBy(usageCategories.displayOrder);
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
    .where(eq(sites.centreId, centreId))
    .orderBy(sites.siteNumber);
  
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
  
  const result = await db.insert(usageCategories).values({
    name,
    isFree,
    displayOrder,
    isActive: true,
    createdAt: new Date(),
  });
  
  return Number(result[0].insertId);
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
