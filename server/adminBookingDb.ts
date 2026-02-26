/**
 * Admin Booking Database Operations
 * Handles admin-created bookings with full audit logging
 */

import { getDb } from "./db";
import { bookings, sites, shoppingCentres, users, customerProfiles, auditLog, usageCategories } from "../drizzle/schema";
import { eq, and, or, lte, gte, ne, desc, asc, sql, inArray } from "drizzle-orm";

export interface AdminBookingInput {
  centreId: number;
  siteId: number;
  customerId: number;
  startDate: Date;
  endDate: Date;
  totalAmount: string;
  gstAmount: string;
  gstPercentage: string;
  ownerAmount: string;
  platformFee: string;
  tablesRequested: number;
  chairsRequested: number;
  paymentMethod: "stripe" | "invoice";
  invoiceOverride: boolean;
  adminComments?: string;
  usageCategoryId?: number;
  additionalCategoryText?: string;
  createdByAdminId: number;
  bookingNumber: string;
}

export interface BookingConflict {
  bookingId: number;
  bookingNumber: string;
  customerName: string;
  companyName: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
}

/**
 * Check for overlapping bookings for a site and date range
 */
export async function checkBookingOverlaps(
  siteId: number,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: number
): Promise<BookingConflict[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      bookingId: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerName: users.name,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .where(
      and(
        eq(bookings.siteId, siteId),
        or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
        // Date overlap: (newStart <= existingEnd) AND (newEnd >= existingStart)
        lte(bookings.startDate, endDate),
        gte(bookings.endDate, startDate),
        excludeBookingId ? ne(bookings.id, excludeBookingId) : sql`1=1`
      )
    );

  const overlaps = await query;

  // Get company names from customer profiles
  const customerIds = overlaps.map((o) => o.bookingId);
  if (customerIds.length === 0) return [];

  const profiles = await db
    .select({
      userId: customerProfiles.userId,
      companyName: customerProfiles.companyName,
    })
    .from(customerProfiles)
    .where(
      inArray(
        customerProfiles.userId,
        overlaps.map((o) => {
          // Get customerId from bookings
          return 0; // Will be filled below
        })
      )
    );

  // Re-query to get customer IDs
  const bookingsWithCustomers = await db
    .select({
      bookingId: bookings.id,
      customerId: bookings.customerId,
    })
    .from(bookings)
    .where(inArray(bookings.id, overlaps.map((o) => o.bookingId)));

  const customerIdMap = new Map(bookingsWithCustomers.map((b) => [b.bookingId, b.customerId]));

  const profilesQuery = await db
    .select({
      userId: customerProfiles.userId,
      companyName: customerProfiles.companyName,
    })
    .from(customerProfiles)
    .where(inArray(customerProfiles.userId, Array.from(new Set(bookingsWithCustomers.map((b) => b.customerId)))));

  const companyMap = new Map(profilesQuery.map((p) => [p.userId, p.companyName]));

  return overlaps.map((o) => ({
    bookingId: o.bookingId,
    bookingNumber: o.bookingNumber,
    customerName: o.customerName || "Unknown",
    companyName: companyMap.get(customerIdMap.get(o.bookingId) || 0) || null,
    startDate: o.startDate,
    endDate: o.endDate,
    status: o.status,
  }));
}

/**
 * Get site availability grid for a centre and month
 */
export async function getSiteAvailabilityGrid(
  centreId: number,
  year: number,
  month: number // 1-12
): Promise<{
  sites: Array<{
    id: number;
    siteNumber: string;
    pricePerDay: string | null;
    weekendPricePerDay: string | null;
    pricePerWeek: string | null;
    outgoingsPerDay: string | null;
    maxTables: number | null;
  }>;
  bookings: Array<{
    siteId: number;
    bookingId: number;
    bookingNumber: string;
    customerId: number;
    customerName: string | null;
    companyName: string | null;
    productCategory: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    startDate: Date;
    endDate: Date;
    tablesRequested: number;
    chairsRequested: number;
    status: string;
  }>;
}> {
  const db = await getDb();
  if (!db) return { sites: [], bookings: [] };

  // Get all active sites for the centre
  const sitesList = await db
    .select({
      id: sites.id,
      siteNumber: sites.siteNumber,
      pricePerDay: sites.pricePerDay,
      weekendPricePerDay: sites.weekendPricePerDay,
      pricePerWeek: sites.pricePerWeek,
      outgoingsPerDay: sites.outgoingsPerDay,
      maxTables: sites.maxTables,
    })
    .from(sites)
    .where(and(eq(sites.centreId, centreId), eq(sites.isActive, true)));

  // Sort sites using natural/alphanumeric ordering (1, 2, 3, ... 10, 11, 12, ... 9a, VK13)
  sitesList.sort((a, b) => {
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

  // Calculate date range for the month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); // Last day of month

  // Get all bookings for these sites in this month
  const siteIds = sitesList.map((s) => s.id);
  if (siteIds.length === 0) return { sites: sitesList, bookings: [] };

  const bookingsList = await db
    .select({
      siteId: bookings.siteId,
      bookingId: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerId: bookings.customerId,
      customerName: users.name,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      tablesRequested: bookings.tablesRequested,
      chairsRequested: bookings.chairsRequested,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .where(
      and(
        inArray(bookings.siteId, siteIds),
        or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
        // Booking overlaps with month
        lte(bookings.startDate, endOfMonth),
        gte(bookings.endDate, startOfMonth)
      )
    );

  // Get customer profiles for company info
  const customerIds = Array.from(new Set(bookingsList.map((b) => b.customerId)));
  const profiles =
    customerIds.length > 0
      ? await db
          .select({
            userId: customerProfiles.userId,
            companyName: customerProfiles.companyName,
            productCategory: customerProfiles.productCategory,
            phone: customerProfiles.phone,
          })
          .from(customerProfiles)
          .where(inArray(customerProfiles.userId, customerIds))
      : [];

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  // Get user emails
  const userEmails =
    customerIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, customerIds))
      : [];

  const emailMap = new Map(userEmails.map((u) => [u.id, u.email]));

  return {
    sites: sitesList,
    bookings: bookingsList.map((b) => {
      const profile = profileMap.get(b.customerId);
      return {
        siteId: b.siteId,
        bookingId: b.bookingId,
        bookingNumber: b.bookingNumber,
        customerId: b.customerId,
        customerName: b.customerName,
        companyName: profile?.companyName || null,
        productCategory: profile?.productCategory || null,
        contactPhone: profile?.phone || null,
        contactEmail: emailMap.get(b.customerId) || null,
        startDate: b.startDate,
        endDate: b.endDate,
        tablesRequested: b.tablesRequested || 0,
        chairsRequested: b.chairsRequested || 0,
        status: b.status,
      };
    }),
  };
}

/**
 * Create an admin booking
 */
export async function createAdminBooking(input: AdminBookingInput): Promise<{ bookingId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [result] = await db.insert(bookings).values({
    bookingNumber: input.bookingNumber,
    siteId: input.siteId,
    customerId: input.customerId,
    usageCategoryId: input.usageCategoryId,
    additionalCategoryText: input.additionalCategoryText,
    startDate: input.startDate,
    endDate: input.endDate,
    totalAmount: input.totalAmount,
    gstAmount: input.gstAmount,
    gstPercentage: input.gstPercentage,
    ownerAmount: input.ownerAmount,
    platformFee: input.platformFee,
    tablesRequested: input.tablesRequested,
    chairsRequested: input.chairsRequested,
    paymentMethod: input.invoiceOverride ? "invoice" : input.paymentMethod,
    invoiceOverride: input.invoiceOverride,
    adminComments: input.adminComments,
    createdByAdmin: input.createdByAdminId,
    status: "confirmed", // Admin bookings are auto-confirmed
    requiresApproval: false,
  }).returning({ id: bookings.id });

  const bookingId = result.id;

  // Record initial status in history (admin-created bookings start as "confirmed")
  const { recordBookingCreated } = await import("./bookingStatusHelper");
  await recordBookingCreated(bookingId, "confirmed", input.createdByAdminId, undefined);

  // Log the creation to audit trail
  await db.insert(auditLog).values({
    userId: input.createdByAdminId,
    action: "admin_booking_create",
    entityType: "booking",
    entityId: bookingId,
    changes: JSON.stringify({
      bookingNumber: input.bookingNumber,
      siteId: input.siteId,
      customerId: input.customerId,
      startDate: input.startDate,
      endDate: input.endDate,
      totalAmount: input.totalAmount,
      paymentMethod: input.invoiceOverride ? "invoice (override)" : input.paymentMethod,
    }),
  });

  return { bookingId };
}

/**
 * Update an existing booking (admin)
 */
export async function updateAdminBooking(
  bookingId: number,
  updates: {
    startDate?: Date;
    endDate?: Date;
    totalAmount?: string;
    gstAmount?: string;
    ownerAmount?: string;
    platformFee?: string;
    tablesRequested?: number;
    chairsRequested?: number;
    adminComments?: string;
  },
  adminUserId: number
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Get current booking for audit
  const [currentBooking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!currentBooking) throw new Error("Booking not found");

  // Build changes object for audit
  const changes: Record<string, { from: any; to: any }> = {};
  if (updates.startDate && updates.startDate.getTime() !== currentBooking.startDate.getTime()) {
    changes.startDate = { from: currentBooking.startDate, to: updates.startDate };
  }
  if (updates.endDate && updates.endDate.getTime() !== currentBooking.endDate.getTime()) {
    changes.endDate = { from: currentBooking.endDate, to: updates.endDate };
  }
  if (updates.totalAmount && updates.totalAmount !== currentBooking.totalAmount) {
    changes.totalAmount = { from: currentBooking.totalAmount, to: updates.totalAmount };
  }
  if (updates.tablesRequested !== undefined && updates.tablesRequested !== currentBooking.tablesRequested) {
    changes.tablesRequested = { from: currentBooking.tablesRequested, to: updates.tablesRequested };
  }
  if (updates.chairsRequested !== undefined && updates.chairsRequested !== currentBooking.chairsRequested) {
    changes.chairsRequested = { from: currentBooking.chairsRequested, to: updates.chairsRequested };
  }
  if (updates.adminComments !== undefined && updates.adminComments !== currentBooking.adminComments) {
    changes.adminComments = { from: currentBooking.adminComments, to: updates.adminComments };
  }

  // Update booking
  await db.update(bookings).set(updates).where(eq(bookings.id, bookingId));

  // Log the update
  if (Object.keys(changes).length > 0) {
    await db.insert(auditLog).values({
      userId: adminUserId,
      action: "admin_booking_update",
      entityType: "booking",
      entityId: bookingId,
      changes: JSON.stringify(changes),
    });
  }

  return { success: true };
}

/**
 * Get all users for admin booking dropdown (alphabetical)
 */
export async function getUsersForAdminBooking(): Promise<
  Array<{
    id: number;
    name: string | null;
    email: string | null;
    companyName: string | null;
    canPayByInvoice: boolean;
    insuranceExpiry: Date | null;
    insuranceAmount: string | null;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const usersList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      canPayByInvoice: users.canPayByInvoice,
    })
    .from(users)
    .orderBy(asc(users.name));

  // Get profiles
  const profiles = await db
    .select({
      userId: customerProfiles.userId,
      companyName: customerProfiles.companyName,
      insuranceExpiry: customerProfiles.insuranceExpiry,
      insuranceAmount: customerProfiles.insuranceAmount,
    })
    .from(customerProfiles);

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return usersList.map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      companyName: profile?.companyName || null,
      canPayByInvoice: u.canPayByInvoice,
      insuranceExpiry: profile?.insuranceExpiry || null,
      insuranceAmount: profile?.insuranceAmount || null,
    };
  });
}

/**
 * Get booking audit history
 */
export async function getBookingAuditHistory(
  bookingId: number
): Promise<
  Array<{
    id: number;
    userId: number;
    userName: string | null;
    action: string;
    changes: string | null;
    createdAt: Date;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const logs = await db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      userName: users.name,
      action: auditLog.action,
      changes: auditLog.changes,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .innerJoin(users, eq(auditLog.userId, users.id))
    .where(and(eq(auditLog.entityType, "booking"), eq(auditLog.entityId, bookingId)))
    .orderBy(desc(auditLog.createdAt));

  return logs;
}

/**
 * Get bookings with pending refunds (cancelled, paid, refund not yet processed)
 */
export async function getPendingRefundBookings(): Promise<
  Array<{
    bookingId: number;
    bookingNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    centreName: string;
    siteNumber: string;
    startDate: Date;
    endDate: Date;
    totalAmount: string;
    gstAmount: string;
    paymentMethod: string;
    stripePaymentIntentId: string | null;
    refundPendingAt: Date | null;
    cancelledAt: Date | null;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      bookingId: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerName: users.name,
      customerEmail: users.email,
      centreName: shoppingCentres.name,
      siteNumber: sites.siteNumber,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      paymentMethod: bookings.paymentMethod,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
      refundPendingAt: bookings.refundPendingAt,
      cancelledAt: bookings.cancelledAt,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(
      and(
        sql`${bookings.refundPendingAt} IS NOT NULL`,
        eq(bookings.refundStatus, "pending"),
      ),
    )
    .orderBy(desc(bookings.cancelledAt));

  return results;
}

/**
 * @deprecated Use `cancelBooking()` from `cancellationService.ts` instead.
 * This function does not create reversal transactions, send emails, or process refunds.
 */
export async function cancelAdminBooking(
  bookingId: number,
  adminUserId: number,
  reason?: string
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Get current booking for audit log
  const [currentBooking] = await db
    .select({
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId));

  if (!currentBooking) {
    throw new Error("Booking not found");
  }

  // Use centralized status change — automatically records history
  const { changeBookingStatus } = await import("./bookingStatusHelper");
  const newComment = reason ? `\n[Cancelled] ${reason}` : '';
  await changeBookingStatus({
    bookingId,
    newStatus: "cancelled",
    changedBy: adminUserId,
    reason: reason || "Cancelled by admin",
    additionalUpdates: reason
      ? { adminComments: sql`CONCAT(COALESCE(${bookings.adminComments}, ''), ${newComment})` }
      : undefined,
  });

  // Also log to audit_log for admin audit trail
  await db.insert(auditLog).values({
    userId: adminUserId,
    action: "admin_booking_cancel",
    entityType: "booking",
    entityId: bookingId,
    changes: JSON.stringify({
      bookingNumber: currentBooking.bookingNumber,
      previousStatus: currentBooking.status,
      newStatus: "cancelled",
      reason: reason || "No reason provided",
    }),
  });

  return { success: true };
}
