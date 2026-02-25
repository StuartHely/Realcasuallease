/**
 * Centralized Booking Status Change Helper
 * 
 * ALL booking status changes MUST go through this module.
 * This ensures every status change is automatically logged to booking_status_history.
 * 
 * DO NOT update booking status directly via db.update(bookings).set({ status: ... })
 * Instead, use changeBookingStatus() from this module.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { bookings, bookingStatusHistory } from "../drizzle/schema";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "rejected";

type StatusChangeOptions = {
  bookingId: number;
  newStatus: BookingStatus;
  changedBy?: number | null;
  changedByName?: string | null;
  reason?: string;
  /** Additional fields to set on the booking alongside the status change */
  additionalUpdates?: Record<string, unknown>;
};

/**
 * The ONE function that changes a booking's status.
 * Automatically reads the old status and writes to booking_status_history.
 * 
 * @returns The previous status before the change
 */
export async function changeBookingStatus(opts: StatusChangeOptions): Promise<{ previousStatus: BookingStatus | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Read current booking to get the old status
  const [current] = await db
    .select({ status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, opts.bookingId));

  if (!current) {
    throw new Error(`Booking ${opts.bookingId} not found`);
  }

  const previousStatus = current.status as BookingStatus;

  // Skip if status hasn't actually changed (avoids duplicate history)
  if (previousStatus === opts.newStatus && !opts.additionalUpdates) {
    return { previousStatus };
  }

  // 2. Update the booking status (plus any additional fields like approvedBy, rejectionReason, etc.)
  await db
    .update(bookings)
    .set({
      status: opts.newStatus,
      ...opts.additionalUpdates,
    })
    .where(eq(bookings.id, opts.bookingId));

  // 3. Automatically record in history — this is what makes it foolproof
  await db.insert(bookingStatusHistory).values({
    bookingId: opts.bookingId,
    previousStatus,
    newStatus: opts.newStatus,
    changedBy: opts.changedBy ?? null,
    changedByName: opts.changedByName ?? null,
    reason: opts.reason ?? `Status changed to ${opts.newStatus}`,
  });

  return { previousStatus };
}

/**
 * Log a status change for non-standard booking types (vacant shops, third-line income).
 * These use separate tables, so we log to auditLog with structured data.
 */
export async function logAssetBookingStatusChange(opts: {
  entityType: "vacant_shop_booking" | "third_line_booking";
  entityId: number;
  previousStatus: string;
  newStatus: string;
  changedBy: number;
  reason?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { auditLog } = await import("../drizzle/schema");
  await db.insert(auditLog).values({
    userId: opts.changedBy,
    action: "status_change",
    entityType: opts.entityType,
    entityId: opts.entityId,
    changes: JSON.stringify({
      previousStatus: opts.previousStatus,
      newStatus: opts.newStatus,
      reason: opts.reason,
    }),
  });
}

/**
 * Record the initial status when a booking is first created.
 * Called right after db.createBooking().
 */
export async function recordBookingCreated(
  bookingId: number,
  initialStatus: BookingStatus,
  createdBy?: number,
  createdByName?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(bookingStatusHistory).values({
    bookingId,
    previousStatus: null,
    newStatus: initialStatus,
    changedBy: createdBy ?? null,
    changedByName: createdByName ?? "System",
    reason: initialStatus === "confirmed" ? "Instant booking confirmed" : "Booking created - pending approval",
  });
}
