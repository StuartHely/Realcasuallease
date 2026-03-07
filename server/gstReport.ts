import { getDb } from "./db";
import {
  bookings,
  sites,
  vacantShopBookings,
  vacantShops,
  thirdLineBookings,
  thirdLineIncome,
  shoppingCentres,
  owners,
  transactions,
} from "../drizzle/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";

// =============================================================================
// Types
// =============================================================================

export type GstCentreRow = {
  centreId: number;
  centreName: string;
  ownerId: number;
  ownerName: string;
  bookingCount: number;
  revenueExGst: number;
  gstAmount: number;
  totalIncGst: number;
  cancellationAdjustment: number;
  netGst: number;
};

export type GstSummary = {
  bookingCount: number;
  revenueExGst: number;
  gstAmount: number;
  totalIncGst: number;
  cancellationAdjustment: number;
  netGst: number;
};

export type GstReport = {
  month: number;
  year: number;
  basis: string;
  cashSummary: GstSummary | null;
  accrualSummary: GstSummary | null;
  centres: GstCentreRow[];
};

// =============================================================================
// Helpers
// =============================================================================

function getMonthRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

type RawBookingRow = {
  centreId: number;
  centreName: string;
  ownerId: number;
  ownerName: string;
  totalAmount: string;
  gstAmount: string;
};

function aggregateRows(rows: RawBookingRow[]): Map<number, GstCentreRow> {
  const map = new Map<number, GstCentreRow>();
  for (const row of rows) {
    const existing = map.get(row.centreId);
    const total = parseFloat(row.totalAmount) || 0;
    const gst = parseFloat(row.gstAmount) || 0;
    const revenueExGst = total - gst;

    if (existing) {
      existing.bookingCount += 1;
      existing.revenueExGst += revenueExGst;
      existing.gstAmount += gst;
      existing.totalIncGst += total;
    } else {
      map.set(row.centreId, {
        centreId: row.centreId,
        centreName: row.centreName,
        ownerId: row.ownerId,
        ownerName: row.ownerName,
        bookingCount: 1,
        revenueExGst,
        gstAmount: gst,
        totalIncGst: total,
        cancellationAdjustment: 0,
        netGst: 0,
      });
    }
  }
  return map;
}

function buildSummary(centres: GstCentreRow[]): GstSummary {
  const summary: GstSummary = {
    bookingCount: 0,
    revenueExGst: 0,
    gstAmount: 0,
    totalIncGst: 0,
    cancellationAdjustment: 0,
    netGst: 0,
  };
  for (const c of centres) {
    summary.bookingCount += c.bookingCount;
    summary.revenueExGst += c.revenueExGst;
    summary.gstAmount += c.gstAmount;
    summary.totalIncGst += c.totalIncGst;
    summary.cancellationAdjustment += c.cancellationAdjustment;
    summary.netGst += c.netGst;
  }
  return summary;
}

// =============================================================================
// Core query functions
// =============================================================================

async function queryStandardBookings(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  dateField: "paidAt" | "approvedAt",
  start: Date,
  end: Date,
  scopedOwnerId?: number | null,
): Promise<RawBookingRow[]> {
  const conditions = [
    gte(bookings[dateField]!, start),
    lte(bookings[dateField]!, end),
    inArray(bookings.status, ["confirmed", "completed"]),
  ];
  if (scopedOwnerId) {
    conditions.push(eq(shoppingCentres.ownerId, scopedOwnerId));
  }

  const rows = await db
    .select({
      centreId: shoppingCentres.id,
      centreName: shoppingCentres.name,
      ownerId: owners.id,
      ownerName: owners.name,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
    })
    .from(bookings)
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .innerJoin(owners, eq(shoppingCentres.ownerId, owners.id))
    .where(and(...conditions));

  return rows as RawBookingRow[];
}

async function queryVacantShopBookings(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  dateField: "paidAt" | "approvedAt",
  start: Date,
  end: Date,
  scopedOwnerId?: number | null,
): Promise<RawBookingRow[]> {
  const conditions = [
    gte(vacantShopBookings[dateField]!, start),
    lte(vacantShopBookings[dateField]!, end),
    inArray(vacantShopBookings.status, ["confirmed", "completed"]),
  ];
  if (scopedOwnerId) {
    conditions.push(eq(shoppingCentres.ownerId, scopedOwnerId));
  }

  const rows = await db
    .select({
      centreId: shoppingCentres.id,
      centreName: shoppingCentres.name,
      ownerId: owners.id,
      ownerName: owners.name,
      totalAmount: vacantShopBookings.totalAmount,
      gstAmount: vacantShopBookings.gstAmount,
    })
    .from(vacantShopBookings)
    .innerJoin(vacantShops, eq(vacantShopBookings.vacantShopId, vacantShops.id))
    .innerJoin(shoppingCentres, eq(vacantShops.centreId, shoppingCentres.id))
    .innerJoin(owners, eq(shoppingCentres.ownerId, owners.id))
    .where(and(...conditions));

  return rows as RawBookingRow[];
}

async function queryThirdLineBookings(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  dateField: "paidAt" | "approvedAt",
  start: Date,
  end: Date,
  scopedOwnerId?: number | null,
): Promise<RawBookingRow[]> {
  const conditions = [
    gte(thirdLineBookings[dateField]!, start),
    lte(thirdLineBookings[dateField]!, end),
    inArray(thirdLineBookings.status, ["confirmed", "completed"]),
  ];
  if (scopedOwnerId) {
    conditions.push(eq(shoppingCentres.ownerId, scopedOwnerId));
  }

  const rows = await db
    .select({
      centreId: shoppingCentres.id,
      centreName: shoppingCentres.name,
      ownerId: owners.id,
      ownerName: owners.name,
      totalAmount: thirdLineBookings.totalAmount,
      gstAmount: thirdLineBookings.gstAmount,
    })
    .from(thirdLineBookings)
    .innerJoin(thirdLineIncome, eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncome.id))
    .innerJoin(shoppingCentres, eq(thirdLineIncome.centreId, shoppingCentres.id))
    .innerJoin(owners, eq(shoppingCentres.ownerId, owners.id))
    .where(and(...conditions));

  return rows as RawBookingRow[];
}

async function queryAllBookingTypes(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  dateField: "paidAt" | "approvedAt",
  start: Date,
  end: Date,
  scopedOwnerId?: number | null,
): Promise<RawBookingRow[]> {
  const [standard, vacant, thirdLine] = await Promise.all([
    queryStandardBookings(db, dateField, start, end, scopedOwnerId),
    queryVacantShopBookings(db, dateField, start, end, scopedOwnerId),
    queryThirdLineBookings(db, dateField, start, end, scopedOwnerId),
  ]);
  return [...standard, ...vacant, ...thirdLine];
}

async function queryCancellationAdjustments(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  start: Date,
  end: Date,
  scopedOwnerId?: number | null,
): Promise<Map<number, number>> {
  const conditions = [
    eq(transactions.type, "cancellation"),
    gte(transactions.createdAt, start),
    lte(transactions.createdAt, end),
  ];
  if (scopedOwnerId) {
    conditions.push(eq(transactions.ownerId, scopedOwnerId));
  }

  // Join transactions → bookings → sites → shoppingCentres to get centreId
  const rows = await db
    .select({
      centreId: shoppingCentres.id,
      gstAmount: transactions.gstAmount,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(and(...conditions));

  const map = new Map<number, number>();
  for (const row of rows) {
    const gst = parseFloat(row.gstAmount) || 0;
    map.set(row.centreId, (map.get(row.centreId) ?? 0) + gst);
  }
  return map;
}

// =============================================================================
// Main export
// =============================================================================

export async function getGstReport(params: {
  month: number;
  year: number;
  basis: "cash" | "accrual" | "both";
  scopedOwnerId?: number | null;
}): Promise<GstReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { month, year, basis, scopedOwnerId } = params;
  const { start, end } = getMonthRange(month, year);

  const cancellations = await queryCancellationAdjustments(db, start, end, scopedOwnerId);

  let cashSummary: GstSummary | null = null;
  let accrualSummary: GstSummary | null = null;
  let centreMap: Map<number, GstCentreRow>;

  if (basis === "cash" || basis === "both") {
    const cashRows = await queryAllBookingTypes(db, "paidAt", start, end, scopedOwnerId);
    centreMap = aggregateRows(cashRows);

    // Apply cancellation adjustments
    cancellations.forEach((adj, centreId) => {
      const row = centreMap.get(centreId);
      if (row) {
        row.cancellationAdjustment = adj;
      } else {
        // Centre only had cancellations, no bookings — still include it
        centreMap.set(centreId, {
          centreId,
          centreName: "",
          ownerId: 0,
          ownerName: "",
          bookingCount: 0,
          revenueExGst: 0,
          gstAmount: 0,
          totalIncGst: 0,
          cancellationAdjustment: adj,
          netGst: 0,
        });
      }
    });

    // Calculate netGst
    Array.from(centreMap.values()).forEach((row) => {
      row.netGst = row.gstAmount + row.cancellationAdjustment;
    });

    const cashCentres = Array.from(centreMap.values());
    cashSummary = buildSummary(cashCentres);
  }

  if (basis === "accrual" || basis === "both") {
    const accrualRows = await queryAllBookingTypes(db, "approvedAt", start, end, scopedOwnerId);
    const accrualMap = aggregateRows(accrualRows);

    // Apply cancellation adjustments
    cancellations.forEach((adj, centreId) => {
      const row = accrualMap.get(centreId);
      if (row) {
        row.cancellationAdjustment = adj;
      } else {
        accrualMap.set(centreId, {
          centreId,
          centreName: "",
          ownerId: 0,
          ownerName: "",
          bookingCount: 0,
          revenueExGst: 0,
          gstAmount: 0,
          totalIncGst: 0,
          cancellationAdjustment: adj,
          netGst: 0,
        });
      }
    });

    Array.from(accrualMap.values()).forEach((row) => {
      row.netGst = row.gstAmount + row.cancellationAdjustment;
    });

    const accrualCentres = Array.from(accrualMap.values());
    accrualSummary = buildSummary(accrualCentres);

    // For accrual-only, use accrual data for centres array
    if (basis === "accrual") {
      centreMap = accrualMap;
    }
  }

  const centres = Array.from(centreMap!.values()).sort((a, b) => {
    const ownerCmp = a.ownerName.localeCompare(b.ownerName);
    if (ownerCmp !== 0) return ownerCmp;
    return a.centreName.localeCompare(b.centreName);
  });

  return {
    month,
    year,
    basis,
    cashSummary,
    accrualSummary,
    centres,
  };
}
