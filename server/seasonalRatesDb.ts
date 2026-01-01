import { getDb } from "./db";
import { seasonalRates } from "../drizzle/schema";
import { eq, and, lte, gte, or, desc } from "drizzle-orm";

export interface SeasonalRate {
  id: number;
  siteId: number;
  name: string;
  startDate: string;
  endDate: string;
  weekdayRate: string | null;
  weekendRate: string | null;
  weeklyRate: string | null;
  createdAt: Date | null;
}

export async function getSeasonalRatesBySiteId(siteId: number): Promise<SeasonalRate[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(seasonalRates)
    .where(eq(seasonalRates.siteId, siteId))
    .orderBy(seasonalRates.startDate);
}

export async function getActiveSeasonalRate(siteId: number, date: Date): Promise<SeasonalRate | null> {
  const db = await getDb();
  if (!db) return null;
  
  const dateStr = date.toISOString().split('T')[0];
  const results = await db.select().from(seasonalRates)
    .where(and(
      eq(seasonalRates.siteId, siteId),
      lte(seasonalRates.startDate, dateStr),
      gte(seasonalRates.endDate, dateStr)
    ))
    .orderBy(desc(seasonalRates.createdAt))
    .limit(1);
  
  return results.length > 0 ? results[0] : null;
}

/**
 * Get all seasonal rates for a site that overlap with the given date range
 * This is more efficient than querying for each individual day
 */
export async function getSeasonalRatesForDateRange(
  siteId: number,
  startDate: string,
  endDate: string
): Promise<SeasonalRate[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Find all seasonal rates that overlap with the booking period
  // A seasonal rate overlaps if: rate.startDate <= booking.endDate AND rate.endDate >= booking.startDate
  return await db.select().from(seasonalRates)
    .where(and(
      eq(seasonalRates.siteId, siteId),
      lte(seasonalRates.startDate, endDate),
      gte(seasonalRates.endDate, startDate)
    ))
    .orderBy(desc(seasonalRates.createdAt));
}

export async function createSeasonalRate(data: {
  siteId: number;
  name: string;
  startDate: string;
  endDate: string;
  weekdayRate?: number;
  weekendRate?: number;
  weeklyRate?: number;
}): Promise<SeasonalRate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(seasonalRates).values({
    siteId: data.siteId,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    weekdayRate: data.weekdayRate ? data.weekdayRate.toString() : null,
    weekendRate: data.weekendRate ? data.weekendRate.toString() : null,
    weeklyRate: data.weeklyRate ? data.weeklyRate.toString() : null,
  });
  
  // Fetch the inserted record
  const rows = await db.select().from(seasonalRates)
    .where(eq(seasonalRates.id, Number(result[0].insertId)))
    .limit(1);
  
  return rows[0];
}

export async function updateSeasonalRate(id: number, data: {
  name?: string;
  startDate?: string;
  endDate?: string;
  weekdayRate?: number;
  weekendRate?: number;
  weeklyRate?: number;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const updates: any = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.startDate !== undefined) updates.startDate = data.startDate;
  if (data.endDate !== undefined) updates.endDate = data.endDate;
  if (data.weekdayRate !== undefined) updates.weekdayRate = data.weekdayRate.toString();
  if (data.weekendRate !== undefined) updates.weekendRate = data.weekendRate.toString();
  if (data.weeklyRate !== undefined) updates.weeklyRate = data.weeklyRate.toString();

  if (Object.keys(updates).length === 0) return false;

  const result = await db.update(seasonalRates)
    .set(updates)
    .where(eq(seasonalRates.id, id));
  
  return result[0].affectedRows > 0;
}

export async function deleteSeasonalRate(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.delete(seasonalRates)
    .where(eq(seasonalRates.id, id));
  
  return result[0].affectedRows > 0;
}
