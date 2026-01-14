import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { fyPercentages, centreBudgets, shoppingCentres } from "../drizzle/schema";

// FY Percentages CRUD

export async function getFyPercentages(financialYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select()
    .from(fyPercentages)
    .where(eq(fyPercentages.financialYear, financialYear))
    .limit(1);
  return result[0] || null;
}

export async function getAllFyPercentages() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(fyPercentages)
    .orderBy(desc(fyPercentages.financialYear));
}

export async function upsertFyPercentages(data: {
  financialYear: number;
  july: string;
  august: string;
  september: string;
  october: string;
  november: string;
  december: string;
  january: string;
  february: string;
  march: string;
  april: string;
  may: string;
  june: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const existing = await getFyPercentages(data.financialYear);
  
  if (existing) {
    await db
      .update(fyPercentages)
      .set({
        july: data.july,
        august: data.august,
        september: data.september,
        october: data.october,
        november: data.november,
        december: data.december,
        january: data.january,
        february: data.february,
        march: data.march,
        april: data.april,
        may: data.may,
        june: data.june,
      })
      .where(eq(fyPercentages.id, existing.id));
    return { ...existing, ...data };
  } else {
    await db.insert(fyPercentages).values(data);
    return data;
  }
}

// Centre Budgets CRUD

export async function getCentreBudget(centreId: number, financialYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select()
    .from(centreBudgets)
    .where(
      and(
        eq(centreBudgets.centreId, centreId),
        eq(centreBudgets.financialYear, financialYear)
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function getCentreBudgetsForYear(financialYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select({
      id: centreBudgets.id,
      centreId: centreBudgets.centreId,
      financialYear: centreBudgets.financialYear,
      annualBudget: centreBudgets.annualBudget,
      centreName: shoppingCentres.name,
      centreState: shoppingCentres.state,
    })
    .from(centreBudgets)
    .innerJoin(shoppingCentres, eq(centreBudgets.centreId, shoppingCentres.id))
    .where(eq(centreBudgets.financialYear, financialYear))
    .orderBy(shoppingCentres.name);
}

export async function upsertCentreBudget(data: {
  centreId: number;
  financialYear: number;
  annualBudget: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const existing = await getCentreBudget(data.centreId, data.financialYear);
  
  if (existing) {
    await db
      .update(centreBudgets)
      .set({ annualBudget: data.annualBudget })
      .where(eq(centreBudgets.id, existing.id));
    return { ...existing, annualBudget: data.annualBudget };
  } else {
    await db.insert(centreBudgets).values(data);
    return data;
  }
}

export async function deleteCentreBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(centreBudgets).where(eq(centreBudgets.id, id));
}

// Calculate monthly budgets from annual budget and percentages
export function calculateMonthlyBudgets(
  annualBudget: number,
  percentages: {
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
  }
) {
  return {
    july: (annualBudget * parseFloat(percentages.july)) / 100,
    august: (annualBudget * parseFloat(percentages.august)) / 100,
    september: (annualBudget * parseFloat(percentages.september)) / 100,
    october: (annualBudget * parseFloat(percentages.october)) / 100,
    november: (annualBudget * parseFloat(percentages.november)) / 100,
    december: (annualBudget * parseFloat(percentages.december)) / 100,
    january: (annualBudget * parseFloat(percentages.january)) / 100,
    february: (annualBudget * parseFloat(percentages.february)) / 100,
    march: (annualBudget * parseFloat(percentages.march)) / 100,
    april: (annualBudget * parseFloat(percentages.april)) / 100,
    may: (annualBudget * parseFloat(percentages.may)) / 100,
    june: (annualBudget * parseFloat(percentages.june)) / 100,
  };
}

// Get all centres for dropdown
export async function getAllCentresForBudget() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select({
      id: shoppingCentres.id,
      name: shoppingCentres.name,
      state: shoppingCentres.state,
    })
    .from(shoppingCentres)
    .orderBy(shoppingCentres.name);
}
