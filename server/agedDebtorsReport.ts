import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "./db";
import {
  bookings,
  vacantShopBookings,
  thirdLineBookings,
  sites,
  vacantShops,
  thirdLineIncome,
  shoppingCentres,
  users,
  customerProfiles,
} from "../drizzle/schema";

// =============================================================================
// Types
// =============================================================================

export type AgeingBuckets = {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  total: number;
};

export type DebtorDetail = {
  bookingId: number;
  bookingNumber: string;
  assetType: "cl" | "vs" | "tli";
  centreName: string;
  startDate: Date;
  endDate: Date;
  totalWithGst: number;
  dueDate: Date;
  daysOverdue: number;
  bucket: string;
};

export type DebtorGroup = {
  groupId: number;
  groupName: string;
  groupSubtitle?: string;
  buckets: AgeingBuckets;
  details: DebtorDetail[];
};

export type AgedDebtorsReport = {
  summary: AgeingBuckets;
  groups: DebtorGroup[];
};

// =============================================================================
// Helpers
// =============================================================================

function emptyBuckets(): AgeingBuckets {
  return { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0, total: 0 };
}

function getBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "days1_30";
  if (daysOverdue <= 60) return "days31_60";
  if (daysOverdue <= 90) return "days61_90";
  return "days90Plus";
}

function addToBuckets(buckets: AgeingBuckets, bucket: string, amount: number): void {
  (buckets as Record<string, number>)[bucket] += amount;
  buckets.total += amount;
}

const MS_PER_DAY = 86400000;
const FOURTEEN_DAYS_MS = 14 * MS_PER_DAY;

function computeDueDate(
  paymentDueDate: Date | null,
  approvedAt: Date | null,
  createdAt: Date,
): Date {
  if (paymentDueDate) return paymentDueDate;
  const base = approvedAt ?? createdAt;
  return new Date(base.getTime() + FOURTEEN_DAYS_MS);
}

// =============================================================================
// Intermediate row shape (unified across all 3 booking tables)
// =============================================================================

type RawDebtorRow = {
  bookingId: number;
  bookingNumber: string;
  assetType: "cl" | "vs" | "tli";
  centreId: number;
  centreName: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  companyName: string | null;
  startDate: Date;
  endDate: Date;
  totalAmount: string;
  gstAmount: string;
  paymentDueDate: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
};

// =============================================================================
// Main function
// =============================================================================

export async function getAgedDebtorsReport(params: {
  groupBy: "customer" | "centre";
  scopedOwnerId?: number | null;
}): Promise<AgedDebtorsReport> {
  const db = await getDb();
  if (!db) {
    return { summary: emptyBuckets(), groups: [] };
  }

  const now = new Date();
  const rows: RawDebtorRow[] = [];

  // --- CL bookings ---
  const clRows = await db
    .select({
      bookingId: bookings.id,
      bookingNumber: bookings.bookingNumber,
      centreId: shoppingCentres.id,
      centreName: shoppingCentres.name,
      customerId: bookings.customerId,
      customerName: users.name,
      customerEmail: users.email,
      companyName: customerProfiles.companyName,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      paymentDueDate: bookings.paymentDueDate,
      approvedAt: bookings.approvedAt,
      createdAt: bookings.createdAt,
      ownerId: shoppingCentres.ownerId,
    })
    .from(bookings)
    .innerJoin(sites, eq(sites.id, bookings.siteId))
    .innerJoin(shoppingCentres, eq(shoppingCentres.id, sites.centreId))
    .innerJoin(users, eq(users.id, bookings.customerId))
    .leftJoin(customerProfiles, eq(customerProfiles.userId, bookings.customerId))
    .where(
      and(
        eq(bookings.status, "confirmed"),
        eq(bookings.paymentMethod, "invoice"),
        isNull(bookings.paidAt),
      ),
    );

  for (const r of clRows) {
    if (params.scopedOwnerId != null && r.ownerId !== params.scopedOwnerId) continue;
    rows.push({ ...r, assetType: "cl", customerName: r.customerName ?? "", customerEmail: r.customerEmail ?? "" });
  }

  // --- VS bookings ---
  const vsRows = await db
    .select({
      bookingId: vacantShopBookings.id,
      bookingNumber: vacantShopBookings.bookingNumber,
      centreId: shoppingCentres.id,
      centreName: shoppingCentres.name,
      customerId: vacantShopBookings.customerId,
      customerName: users.name,
      customerEmail: users.email,
      companyName: customerProfiles.companyName,
      startDate: vacantShopBookings.startDate,
      endDate: vacantShopBookings.endDate,
      totalAmount: vacantShopBookings.totalAmount,
      gstAmount: vacantShopBookings.gstAmount,
      paymentDueDate: vacantShopBookings.paymentDueDate,
      approvedAt: vacantShopBookings.approvedAt,
      createdAt: vacantShopBookings.createdAt,
      ownerId: shoppingCentres.ownerId,
    })
    .from(vacantShopBookings)
    .innerJoin(vacantShops, eq(vacantShops.id, vacantShopBookings.vacantShopId))
    .innerJoin(shoppingCentres, eq(shoppingCentres.id, vacantShops.centreId))
    .innerJoin(users, eq(users.id, vacantShopBookings.customerId))
    .leftJoin(customerProfiles, eq(customerProfiles.userId, vacantShopBookings.customerId))
    .where(
      and(
        eq(vacantShopBookings.status, "confirmed"),
        eq(vacantShopBookings.paymentMethod, "invoice"),
        isNull(vacantShopBookings.paidAt),
      ),
    );

  for (const r of vsRows) {
    if (params.scopedOwnerId != null && r.ownerId !== params.scopedOwnerId) continue;
    rows.push({ ...r, assetType: "vs", customerName: r.customerName ?? "", customerEmail: r.customerEmail ?? "" });
  }

  // --- TLI bookings ---
  const tliRows = await db
    .select({
      bookingId: thirdLineBookings.id,
      bookingNumber: thirdLineBookings.bookingNumber,
      centreId: shoppingCentres.id,
      centreName: shoppingCentres.name,
      customerId: thirdLineBookings.customerId,
      customerName: users.name,
      customerEmail: users.email,
      companyName: customerProfiles.companyName,
      startDate: thirdLineBookings.startDate,
      endDate: thirdLineBookings.endDate,
      totalAmount: thirdLineBookings.totalAmount,
      gstAmount: thirdLineBookings.gstAmount,
      paymentDueDate: thirdLineBookings.paymentDueDate,
      approvedAt: thirdLineBookings.approvedAt,
      createdAt: thirdLineBookings.createdAt,
      ownerId: shoppingCentres.ownerId,
    })
    .from(thirdLineBookings)
    .innerJoin(thirdLineIncome, eq(thirdLineIncome.id, thirdLineBookings.thirdLineIncomeId))
    .innerJoin(shoppingCentres, eq(shoppingCentres.id, thirdLineIncome.centreId))
    .innerJoin(users, eq(users.id, thirdLineBookings.customerId))
    .leftJoin(customerProfiles, eq(customerProfiles.userId, thirdLineBookings.customerId))
    .where(
      and(
        eq(thirdLineBookings.status, "confirmed"),
        eq(thirdLineBookings.paymentMethod, "invoice"),
        isNull(thirdLineBookings.paidAt),
      ),
    );

  for (const r of tliRows) {
    if (params.scopedOwnerId != null && r.ownerId !== params.scopedOwnerId) continue;
    rows.push({ ...r, assetType: "tli", customerName: r.customerName ?? "", customerEmail: r.customerEmail ?? "" });
  }

  // --- Build details with bucketing ---
  const details: (DebtorDetail & { customerId: number; centreId: number; customerName: string; customerEmail: string; companyName: string | null })[] = [];

  for (const row of rows) {
    const dueDate = computeDueDate(row.paymentDueDate, row.approvedAt, row.createdAt);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / MS_PER_DAY);
    const bucket = getBucket(daysOverdue);
    const totalWithGst = parseFloat(row.totalAmount) + parseFloat(row.gstAmount);

    details.push({
      bookingId: row.bookingId,
      bookingNumber: row.bookingNumber,
      assetType: row.assetType,
      centreName: row.centreName,
      startDate: row.startDate,
      endDate: row.endDate,
      totalWithGst,
      dueDate,
      daysOverdue,
      bucket,
      customerId: row.customerId,
      centreId: row.centreId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      companyName: row.companyName,
    });
  }

  // --- Group ---
  const groupMap = new Map<number, DebtorGroup>();

  for (const d of details) {
    const groupId = params.groupBy === "customer" ? d.customerId : d.centreId;
    const groupName =
      params.groupBy === "customer"
        ? d.companyName || d.customerName
        : d.centreName;
    const groupSubtitle = params.groupBy === "customer" ? d.customerEmail : undefined;

    let group = groupMap.get(groupId);
    if (!group) {
      group = {
        groupId,
        groupName,
        groupSubtitle,
        buckets: emptyBuckets(),
        details: [],
      };
      groupMap.set(groupId, group);
    }

    addToBuckets(group.buckets, d.bucket, d.totalWithGst);
    group.details.push({
      bookingId: d.bookingId,
      bookingNumber: d.bookingNumber,
      assetType: d.assetType,
      centreName: d.centreName,
      startDate: d.startDate,
      endDate: d.endDate,
      totalWithGst: d.totalWithGst,
      dueDate: d.dueDate,
      daysOverdue: d.daysOverdue,
      bucket: d.bucket,
    });
  }

  // --- Summary ---
  const summary = emptyBuckets();
  const groups = Array.from(groupMap.values());

  for (const group of groups) {
    summary.current += group.buckets.current;
    summary.days1_30 += group.buckets.days1_30;
    summary.days31_60 += group.buckets.days31_60;
    summary.days61_90 += group.buckets.days61_90;
    summary.days90Plus += group.buckets.days90Plus;
    summary.total += group.buckets.total;
  }

  return { summary, groups };
}
