import { getDb } from "./db";
import { imageAnalytics, sites } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function trackImageView(siteId: number, imageSlot: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(imageAnalytics)
    .where(and(
      eq(imageAnalytics.siteId, siteId),
      eq(imageAnalytics.imageSlot, imageSlot)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(imageAnalytics)
      .set({
        viewCount: sql`${imageAnalytics.viewCount} + 1`,
        lastViewedAt: new Date(),
      })
      .where(eq(imageAnalytics.id, existing[0].id));
  } else {
    await db.insert(imageAnalytics).values({
      siteId,
      imageSlot,
      viewCount: 1,
      clickCount: 0,
      lastViewedAt: new Date(),
    });
  }
}

export async function trackImageClick(siteId: number, imageSlot: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(imageAnalytics)
    .where(and(
      eq(imageAnalytics.siteId, siteId),
      eq(imageAnalytics.imageSlot, imageSlot)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(imageAnalytics)
      .set({
        clickCount: sql`${imageAnalytics.clickCount} + 1`,
        lastClickedAt: new Date(),
      })
      .where(eq(imageAnalytics.id, existing[0].id));
  } else {
    await db.insert(imageAnalytics).values({
      siteId,
      imageSlot,
      viewCount: 0,
      clickCount: 1,
      lastClickedAt: new Date(),
    });
  }
}

export interface ImageAnalyticsData {
  siteId: number;
  siteName: string;
  imageSlot: number;
  imageUrl: string | null;
  viewCount: number;
  clickCount: number;
  clickThroughRate: number;
  bookingCount: number;
  conversionRate: number;
  lastViewedAt: Date | null;
  lastClickedAt: Date | null;
}

export async function getTopPerformingImages(limit: number = 10): Promise<ImageAnalyticsData[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    siteId: imageAnalytics.siteId,
    imageSlot: imageAnalytics.imageSlot,
    viewCount: imageAnalytics.viewCount,
    clickCount: imageAnalytics.clickCount,
    lastViewedAt: imageAnalytics.lastViewedAt,
    lastClickedAt: imageAnalytics.lastClickedAt,
  })
  .from(imageAnalytics)
  .orderBy(desc(imageAnalytics.viewCount))
  .limit(limit);

  // Import bookings table for conversion metrics
  const { bookings } = await import("../drizzle/schema");

  // Fetch site details for each result
  const enriched: ImageAnalyticsData[] = [];
  for (const row of results) {
    const siteResults = await db.select().from(sites)
      .where(eq(sites.id, row.siteId))
      .limit(1);
    const site = siteResults[0];

    if (site) {
      const imageUrl = row.imageSlot === 1 ? site.imageUrl1 :
                      row.imageSlot === 2 ? site.imageUrl2 :
                      row.imageSlot === 3 ? site.imageUrl3 :
                      site.imageUrl4;

      // Get booking count for this site
      const bookingResults = await db.select()
        .from(bookings)
        .where(eq(bookings.siteId, row.siteId));
      const bookingCount = bookingResults.length;

      enriched.push({
        siteId: row.siteId,
        siteName: site.siteNumber,
        imageSlot: row.imageSlot,
        imageUrl,
        viewCount: row.viewCount,
        clickCount: row.clickCount,
        clickThroughRate: row.viewCount > 0 ? (row.clickCount / row.viewCount) * 100 : 0,
        bookingCount,
        conversionRate: row.viewCount > 0 ? (bookingCount / row.viewCount) * 100 : 0,
        lastViewedAt: row.lastViewedAt,
        lastClickedAt: row.lastClickedAt,
      });
    }
  }

  return enriched;
}

export async function getImageAnalyticsBySite(siteId: number): Promise<ImageAnalyticsData[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select().from(imageAnalytics)
    .where(eq(imageAnalytics.siteId, siteId));

  const siteResults = await db.select().from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  const site = siteResults[0];

  if (!site) return [];

  // Get booking count for this site
  const { bookings } = await import("../drizzle/schema");
  const bookingResults = await db.select()
    .from(bookings)
    .where(eq(bookings.siteId, siteId));
  const bookingCount = bookingResults.length;

  return results.map(row => {
    const imageUrl = row.imageSlot === 1 ? site.imageUrl1 :
                    row.imageSlot === 2 ? site.imageUrl2 :
                    row.imageSlot === 3 ? site.imageUrl3 :
                    site.imageUrl4;

    return {
      siteId: row.siteId,
      siteName: site.siteNumber,
      imageSlot: row.imageSlot,
      imageUrl,
      viewCount: row.viewCount,
      clickCount: row.clickCount,
      clickThroughRate: row.viewCount > 0 ? (row.clickCount / row.viewCount) * 100 : 0,
      bookingCount,
      conversionRate: row.viewCount > 0 ? (bookingCount / row.viewCount) * 100 : 0,
      lastViewedAt: row.lastViewedAt,
      lastClickedAt: row.lastClickedAt,
    };
  });
}
