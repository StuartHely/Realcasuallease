import { eq, and, inArray, lte, gte } from "drizzle-orm";
import { getDb } from "./db";
import {
  shoppingCentres,
  owners,
  portfolios,
  sites,
  bookings,
  vacantShops,
  vacantShopBookings,
  thirdLineIncome,
  thirdLineBookings,
} from "../drizzle/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetOccupancy = {
  assetId: number;
  assetLabel: string;
  assetType: "cl" | "vs" | "tli";
  availableDays: number;
  bookedDays: number;
  occupancyPercent: number;
  revenue: number;
};

export type CentreOccupancy = {
  centreId: number;
  centreName: string;
  portfolioId: number | null;
  portfolioName: string | null;
  ownerId: number;
  ownerName: string;
  totalAssets: number;
  availableDays: number;
  bookedDays: number;
  occupancyPercent: number;
  revenue: number;
  assets: AssetOccupancy[];
};

export type OccupancyReport = {
  summary: {
    totalAssets: number;
    availableDays: number;
    bookedDays: number;
    occupancyPercent: number;
    revenue: number;
  };
  centres: CentreOccupancy[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

function daysInRange(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function overlapDays(
  bookingStart: Date,
  bookingEnd: Date,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  const overlapStart = bookingStart > rangeStart ? bookingStart : rangeStart;
  const overlapEnd = bookingEnd < rangeEnd ? bookingEnd : rangeEnd;
  const days =
    Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY) +
    1;
  return days > 0 ? days : 0;
}

const VALID_STATUSES = ["confirmed", "completed"] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function getOccupancyReport(params: {
  startDate: Date;
  endDate: Date;
  centreId?: number;
  portfolioId?: number;
  assetTypes?: string[];
  scopedOwnerId?: number | null;
}): Promise<OccupancyReport> {
  const db = await getDb();
  if (!db) {
    return {
      summary: {
        totalAssets: 0,
        availableDays: 0,
        bookedDays: 0,
        occupancyPercent: 0,
        revenue: 0,
      },
      centres: [],
    };
  }

  const { startDate, endDate, centreId, portfolioId, assetTypes, scopedOwnerId } = params;
  const rangeDays = daysInRange(startDate, endDate);
  const wantedTypes = assetTypes ?? ["cl", "vs", "tli"];

  // ------------------------------------------------------------------
  // 1. Fetch centres with owner/portfolio info
  // ------------------------------------------------------------------
  const centreFilters: ReturnType<typeof eq>[] = [];
  if (centreId != null) centreFilters.push(eq(shoppingCentres.id, centreId));
  if (portfolioId != null) centreFilters.push(eq(shoppingCentres.portfolioId, portfolioId));
  if (scopedOwnerId != null) centreFilters.push(eq(shoppingCentres.ownerId, scopedOwnerId));

  const centreRows = await db
    .select({
      id: shoppingCentres.id,
      name: shoppingCentres.name,
      ownerId: shoppingCentres.ownerId,
      portfolioId: shoppingCentres.portfolioId,
      ownerName: owners.name,
      portfolioName: portfolios.name,
    })
    .from(shoppingCentres)
    .innerJoin(owners, eq(shoppingCentres.ownerId, owners.id))
    .leftJoin(portfolios, eq(shoppingCentres.portfolioId, portfolios.id))
    .where(centreFilters.length > 0 ? and(...centreFilters) : undefined);

  if (centreRows.length === 0) {
    return {
      summary: { totalAssets: 0, availableDays: 0, bookedDays: 0, occupancyPercent: 0, revenue: 0 },
      centres: [],
    };
  }

  const centreIds = centreRows.map((c) => c.id);

  // ------------------------------------------------------------------
  // 2. Fetch active assets per type
  // ------------------------------------------------------------------
  type RawAsset = { id: number; label: string; centreId: number };

  const clAssets: RawAsset[] = [];
  const vsAssets: RawAsset[] = [];
  const tliAssets: RawAsset[] = [];

  if (wantedTypes.includes("cl")) {
    const rows = await db
      .select({ id: sites.id, label: sites.siteNumber, centreId: sites.centreId })
      .from(sites)
      .where(and(inArray(sites.centreId, centreIds), eq(sites.isActive, true)));
    clAssets.push(...rows);
  }

  if (wantedTypes.includes("vs")) {
    const rows = await db
      .select({ id: vacantShops.id, label: vacantShops.shopNumber, centreId: vacantShops.centreId })
      .from(vacantShops)
      .where(and(inArray(vacantShops.centreId, centreIds), eq(vacantShops.isActive, true)));
    vsAssets.push(...rows);
  }

  if (wantedTypes.includes("tli")) {
    const rows = await db
      .select({ id: thirdLineIncome.id, label: thirdLineIncome.assetNumber, centreId: thirdLineIncome.centreId })
      .from(thirdLineIncome)
      .where(and(inArray(thirdLineIncome.centreId, centreIds), eq(thirdLineIncome.isActive, true)));
    tliAssets.push(...rows);
  }

  // ------------------------------------------------------------------
  // 3. Fetch overlapping confirmed/completed bookings per type
  // ------------------------------------------------------------------
  type RawBooking = {
    assetId: number;
    startDate: Date;
    endDate: Date;
    totalAmount: string;
  };

  const clBookings: RawBooking[] = [];
  const vsBookings: RawBooking[] = [];
  const tliBookings: RawBooking[] = [];

  if (clAssets.length > 0) {
    const assetIds = clAssets.map((a) => a.id);
    const rows = await db
      .select({
        assetId: bookings.siteId,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.siteId, assetIds),
          lte(bookings.startDate, endDate),
          gte(bookings.endDate, startDate),
          inArray(bookings.status, [...VALID_STATUSES]),
        ),
      );
    clBookings.push(...rows);
  }

  if (vsAssets.length > 0) {
    const assetIds = vsAssets.map((a) => a.id);
    const rows = await db
      .select({
        assetId: vacantShopBookings.vacantShopId,
        startDate: vacantShopBookings.startDate,
        endDate: vacantShopBookings.endDate,
        totalAmount: vacantShopBookings.totalAmount,
      })
      .from(vacantShopBookings)
      .where(
        and(
          inArray(vacantShopBookings.vacantShopId, assetIds),
          lte(vacantShopBookings.startDate, endDate),
          gte(vacantShopBookings.endDate, startDate),
          inArray(vacantShopBookings.status, [...VALID_STATUSES]),
        ),
      );
    vsBookings.push(...rows);
  }

  if (tliAssets.length > 0) {
    const assetIds = tliAssets.map((a) => a.id);
    const rows = await db
      .select({
        assetId: thirdLineBookings.thirdLineIncomeId,
        startDate: thirdLineBookings.startDate,
        endDate: thirdLineBookings.endDate,
        totalAmount: thirdLineBookings.totalAmount,
      })
      .from(thirdLineBookings)
      .where(
        and(
          inArray(thirdLineBookings.thirdLineIncomeId, assetIds),
          lte(thirdLineBookings.startDate, endDate),
          gte(thirdLineBookings.endDate, startDate),
          inArray(thirdLineBookings.status, [...VALID_STATUSES]),
        ),
      );
    tliBookings.push(...rows);
  }

  // ------------------------------------------------------------------
  // 4. Build per-asset booking maps (assetId -> { bookedDays, revenue })
  // ------------------------------------------------------------------
  function buildBookingMap(rawBookings: RawBooking[]): Map<number, { bookedDays: number; revenue: number }> {
    const map = new Map<number, { bookedDays: number; revenue: number }>();
    for (const b of rawBookings) {
      const days = overlapDays(b.startDate, b.endDate, startDate, endDate);
      const rev = parseFloat(b.totalAmount) || 0;
      const existing = map.get(b.assetId);
      if (existing) {
        existing.bookedDays += days;
        existing.revenue += rev;
      } else {
        map.set(b.assetId, { bookedDays: days, revenue: rev });
      }
    }
    return map;
  }

  const clMap = buildBookingMap(clBookings);
  const vsMap = buildBookingMap(vsBookings);
  const tliMap = buildBookingMap(tliBookings);

  // ------------------------------------------------------------------
  // 5. Assemble per-centre results
  // ------------------------------------------------------------------
  function buildAssetOccupancies(
    assets: RawAsset[],
    bookingMap: Map<number, { bookedDays: number; revenue: number }>,
    assetType: "cl" | "vs" | "tli",
    centreId: number,
  ): AssetOccupancy[] {
    return assets
      .filter((a) => a.centreId === centreId)
      .map((a) => {
        const stats = bookingMap.get(a.id);
        const bookedDays = stats?.bookedDays ?? 0;
        const revenue = stats?.revenue ?? 0;
        return {
          assetId: a.id,
          assetLabel: a.label,
          assetType,
          availableDays: rangeDays,
          bookedDays,
          occupancyPercent: rangeDays > 0 ? Math.round((bookedDays / rangeDays) * 10000) / 100 : 0,
          revenue,
        };
      });
  }

  const centreResults: CentreOccupancy[] = centreRows.map((c) => {
    const assets: AssetOccupancy[] = [
      ...buildAssetOccupancies(clAssets, clMap, "cl", c.id),
      ...buildAssetOccupancies(vsAssets, vsMap, "vs", c.id),
      ...buildAssetOccupancies(tliAssets, tliMap, "tli", c.id),
    ];

    const totalAssets = assets.length;
    const availableDays = assets.reduce((sum, a) => sum + a.availableDays, 0);
    const bookedDays = assets.reduce((sum, a) => sum + a.bookedDays, 0);
    const revenue = assets.reduce((sum, a) => sum + a.revenue, 0);

    return {
      centreId: c.id,
      centreName: c.name,
      portfolioId: c.portfolioId,
      portfolioName: c.portfolioName,
      ownerId: c.ownerId,
      ownerName: c.ownerName,
      totalAssets,
      availableDays,
      bookedDays,
      occupancyPercent: availableDays > 0 ? Math.round((bookedDays / availableDays) * 10000) / 100 : 0,
      revenue,
      assets,
    };
  });

  // ------------------------------------------------------------------
  // 6. Overall summary
  // ------------------------------------------------------------------
  const totalAssets = centreResults.reduce((sum, c) => sum + c.totalAssets, 0);
  const totalAvailable = centreResults.reduce((sum, c) => sum + c.availableDays, 0);
  const totalBooked = centreResults.reduce((sum, c) => sum + c.bookedDays, 0);
  const totalRevenue = centreResults.reduce((sum, c) => sum + c.revenue, 0);

  return {
    summary: {
      totalAssets,
      availableDays: totalAvailable,
      bookedDays: totalBooked,
      occupancyPercent: totalAvailable > 0 ? Math.round((totalBooked / totalAvailable) * 10000) / 100 : 0,
      revenue: totalRevenue,
    },
    centres: centreResults,
  };
}
