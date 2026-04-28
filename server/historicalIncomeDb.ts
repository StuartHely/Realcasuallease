import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { historicalIncome } from "../drizzle/schema";

// Get all historical income for a centre, optionally filtered by asset type
export async function getHistoricalIncome(centreId: number, assetType?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(historicalIncome.centreId, centreId)];
  if (assetType) {
    conditions.push(eq(historicalIncome.assetType, assetType));
  }

  return db.select().from(historicalIncome)
    .where(and(...conditions))
    .orderBy(historicalIncome.year, historicalIncome.month);
}

// Get historical income totals for a centre within a date range (for dashboard integration)
export async function getHistoricalIncomeTotal(
  centreId: number,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number,
  assetType?: string,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Build date range filter using year*100+month for comparison
  const startVal = startYear * 100 + startMonth;
  const endVal = endYear * 100 + endMonth;

  const conditions: any[] = [
    eq(historicalIncome.centreId, centreId),
    sql`(${historicalIncome.year} * 100 + ${historicalIncome.month}) >= ${startVal}`,
    sql`(${historicalIncome.year} * 100 + ${historicalIncome.month}) <= ${endVal}`,
  ];
  if (assetType) {
    conditions.push(eq(historicalIncome.assetType, assetType));
  }

  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${historicalIncome.amount}), 0)` })
    .from(historicalIncome)
    .where(and(...conditions));

  return parseFloat(result[0]?.total || "0");
}

// Upsert a single historical income record
export async function upsertHistoricalIncome(data: {
  centreId: number;
  assetType: string;
  assetId: number | null;
  month: number;
  year: number;
  amount: string;
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check for existing record
  const conditions: any[] = [
    eq(historicalIncome.centreId, data.centreId),
    eq(historicalIncome.assetType, data.assetType),
    eq(historicalIncome.month, data.month),
    eq(historicalIncome.year, data.year),
  ];
  if (data.assetId != null) {
    conditions.push(eq(historicalIncome.assetId, data.assetId));
  } else {
    conditions.push(sql`${historicalIncome.assetId} IS NULL`);
  }

  const existing = await db.select().from(historicalIncome).where(and(...conditions));

  if (existing.length > 0) {
    await db.update(historicalIncome)
      .set({ amount: data.amount, notes: data.notes ?? null, updatedAt: new Date() })
      .where(eq(historicalIncome.id, existing[0].id));
    return { action: "updated" as const, id: existing[0].id };
  }

  const [result] = await db.insert(historicalIncome).values({
    centreId: data.centreId,
    assetType: data.assetType,
    assetId: data.assetId,
    month: data.month,
    year: data.year,
    amount: data.amount,
    notes: data.notes ?? null,
  }).returning();

  return { action: "created" as const, id: result.id };
}

// Bulk import historical income from CSV data
export async function bulkImportHistoricalIncome(
  centreId: number,
  assetType: string,
  rows: Array<{ month: number; year: number; amount: string; assetId?: number | null; notes?: string | null }>
): Promise<{ created: number; updated: number; errors: string[] }> {
  const results = { created: 0, updated: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const result = await upsertHistoricalIncome({
        centreId,
        assetType,
        assetId: row.assetId ?? null,
        month: row.month,
        year: row.year,
        amount: row.amount,
        notes: row.notes ?? null,
      });
      if (result.action === "created") results.created++;
      else results.updated++;
    } catch (err: any) {
      results.errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return results;
}

// Delete a historical income record
export async function deleteHistoricalIncome(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(historicalIncome).where(eq(historicalIncome.id, id));
}

// Delete all historical income for a centre + asset type (for reimport)
export async function deleteHistoricalIncomeByScope(centreId: number, assetType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(historicalIncome).where(
    and(eq(historicalIncome.centreId, centreId), eq(historicalIncome.assetType, assetType))
  );
}
