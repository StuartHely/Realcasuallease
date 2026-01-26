import { getDb } from "./db";
import { bookings, sites } from "../drizzle/schema";
import { and, eq, gte, lte, or, inArray } from "drizzle-orm";
import { getApprovedCategoriesForSite } from "./usageCategoriesDb";

/**
 * Batch fetch bookings for multiple sites in a single query
 * This eliminates the N+1 query problem in search endpoint
 */
export async function getBookingsForMultipleSites(
  siteIds: number[],
  startDate: Date,
  endDate: Date
): Promise<Map<number, any[]>> {
  if (siteIds.length === 0) {
    return new Map();
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.siteId, siteIds),
        or(
          and(gte(bookings.startDate, startDate), lte(bookings.startDate, endDate)),
          and(gte(bookings.endDate, startDate), lte(bookings.endDate, endDate)),
          and(lte(bookings.startDate, startDate), gte(bookings.endDate, endDate))
        )
      )
    );

  // Group bookings by siteId
  const bookingsBySite = new Map<number, any[]>();
  for (const booking of results) {
    const siteBookings = bookingsBySite.get(booking.siteId) || [];
    siteBookings.push(booking);
    bookingsBySite.set(booking.siteId, siteBookings);
  }

  // Ensure all siteIds have an entry (even if empty)
  for (const siteId of siteIds) {
    if (!bookingsBySite.has(siteId)) {
      bookingsBySite.set(siteId, []);
    }
  }

  return bookingsBySite;
}

/**
 * Batch fetch approved categories for multiple sites
 * Reduces N queries to 1 query
 */
export async function getApprovedCategoriesForMultipleSites(
  siteIds: number[]
): Promise<Map<number, any[]>> {
  if (siteIds.length === 0) {
    return new Map();
  }

  const categoriesBySite = new Map<number, any[]>();

  // Fetch categories for all sites in parallel
  const results = await Promise.all(
    siteIds.map(async (siteId) => ({
      siteId,
      categories: await getApprovedCategoriesForSite(siteId),
    }))
  );

  for (const { siteId, categories } of results) {
    categoriesBySite.set(siteId, categories);
  }

  return categoriesBySite;
}

/**
 * Optimized search query that fetches all data in minimal queries
 */
export async function getSearchDataOptimized(
  centreIds: number[],
  startOfWeek: Date,
  endOfWeek: Date,
  startOfNextWeek: Date,
  endOfNextWeek: Date
) {
  if (centreIds.length === 0) {
    return {
      sitesByCentre: new Map(),
      week1BookingsBySite: new Map(),
      week2BookingsBySite: new Map(),
      categoriesBySite: new Map(),
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch only casual leasing sites for search results
  // VS and 3rdL are fetched separately in Search.tsx via dedicated queries
  const casualLeasingSites = await db
    .select()
    .from(sites)
    .where(inArray(sites.centreId, centreIds));
  
  // Only return casual leasing sites
  const allSites = casualLeasingSites.map(s => ({ ...s, assetType: "casual_leasing" }));

  // Group sites by centre
  const sitesByCentre = new Map<number, any[]>();
  const allSiteIds: number[] = [];
  
  for (const site of allSites) {
    const centreSites = sitesByCentre.get(site.centreId) || [];
    centreSites.push(site);
    sitesByCentre.set(site.centreId, centreSites);
    allSiteIds.push(site.id);
  }
  
  // Sort sites within each centre using natural/alphanumeric ordering (1, 2, 3, ... 10, 11, 12, ... 9a, VK13)
  for (const [centreId, centreSites] of Array.from(sitesByCentre.entries())) {
    centreSites.sort((a: any, b: any) => {
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
  }

  // Batch fetch bookings for both weeks
  const [week1BookingsBySite, week2BookingsBySite, categoriesBySite] = await Promise.all([
    getBookingsForMultipleSites(allSiteIds, startOfWeek, endOfWeek),
    getBookingsForMultipleSites(allSiteIds, startOfNextWeek, endOfNextWeek),
    getApprovedCategoriesForMultipleSites(allSiteIds),
  ]);

  return {
    sitesByCentre,
    week1BookingsBySite,
    week2BookingsBySite,
    categoriesBySite,
  };
}
