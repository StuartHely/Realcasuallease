/**
 * Centralized Cancellation Service
 *
 * Handles: status update, audit trail, booking_status_history,
 * reversal transaction, GST adjustment, Stripe refund, and customer notification.
 */

import { eq, sql } from "drizzle-orm";
import {
  bookings,
  bookingStatusHistory,
  transactions,
  auditLog,
  sites,
  shoppingCentres,
  users,
  customerProfiles,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

export async function cancelBooking(params: {
  bookingId: number;
  adminUserId: number;
  reason?: string;
  performRefund: boolean;
}): Promise<{
  success: boolean;
  bookingNumber: string;
  refundStatus: string | null;
}> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // --- Part A: Fetch full booking context ---
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, params.bookingId));
  if (!booking) throw new Error("Booking not found");

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, booking.siteId));
  if (!site) throw new Error("Site not found for booking");

  const [centre] = await db
    .select()
    .from(shoppingCentres)
    .where(eq(shoppingCentres.id, site.centreId));
  if (!centre) throw new Error("Centre not found for site");

  const [customer] = await db
    .select()
    .from(users)
    .where(eq(users.id, booking.customerId));
  if (!customer) throw new Error("Customer not found for booking");

  const [profile] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.userId, booking.customerId));

  const [adminUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, params.adminUserId));

  const previousStatus = booking.status;
  const now = new Date();

  // --- Part B: Determine refund status ---
  let refundStatus: string | null = null;
  let refundPendingAt: Date | null = null;

  if (!booking.paidAt) {
    refundStatus = "not_required";
  } else if (booking.paymentMethod === "invoice") {
    refundStatus = "manual";
  } else if (booking.paymentMethod === "stripe" && params.performRefund) {
    refundStatus = "pending"; // will be updated to "processed" after Stripe call
  } else if (booking.paymentMethod === "stripe" && !params.performRefund) {
    refundStatus = "pending";
    refundPendingAt = now;
  }

  // Update booking status and set cancellation fields
  const newComment = params.reason ? `\n[Cancelled] ${params.reason}` : "";
  await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: now,
      adminComments: newComment
        ? sql`CONCAT(COALESCE(${bookings.adminComments}, ''), ${newComment})`
        : undefined,
      refundStatus,
      refundPendingAt,
    })
    .where(eq(bookings.id, params.bookingId));

  // --- Part C: Write to booking_status_history ---
  await db.insert(bookingStatusHistory).values({
    bookingId: params.bookingId,
    previousStatus: previousStatus as any,
    newStatus: "cancelled",
    changedBy: params.adminUserId,
    changedByName: adminUser?.name || "Unknown",
    reason: params.reason || "Cancelled by administrator",
  });

  // --- Part D: Create reversal transaction record ---
  const [originalTx] = await db
    .select()
    .from(transactions)
    .where(
      eq(transactions.bookingId, params.bookingId),
    );

  if (originalTx && originalTx.type === "booking") {
    const creditNoteNumber = `CN-${booking.bookingNumber}`;

    await db.insert(transactions).values({
      bookingId: params.bookingId,
      ownerId: centre.ownerId,
      type: "cancellation",
      amount: `-${originalTx.amount}` as any,
      gstAmount: `-${originalTx.gstAmount}` as any,
      gstPercentage: originalTx.gstPercentage,
      ownerAmount: `-${originalTx.ownerAmount}` as any,
      platformFee: `-${originalTx.platformFee}` as any,
      remitted: false,
      gstAdjustmentNoteNumber: creditNoteNumber,
    });
  } else if (!originalTx) {
    console.warn(
      `[CancellationService] No booking transaction found for booking ${booking.bookingNumber} — skipping reversal`,
    );
  }

  // --- Part E: Process Stripe refund (conditional) ---
  if (
    params.performRefund &&
    booking.paymentMethod === "stripe" &&
    booking.paidAt &&
    booking.stripePaymentIntentId
  ) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(ENV.stripeSecretKey);

      await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
      });

      // Stripe succeeded — update refund status
      refundStatus = "processed";
      await db
        .update(bookings)
        .set({ refundStatus: "processed" })
        .where(eq(bookings.id, params.bookingId));
    } catch (stripeError) {
      console.error(
        `[CancellationService] Stripe refund failed for booking ${booking.bookingNumber}:`,
        stripeError,
      );
      // Ensure booking is flagged for admin follow-up
      refundStatus = "pending";
      await db
        .update(bookings)
        .set({ refundStatus: "pending", refundPendingAt: now })
        .where(eq(bookings.id, params.bookingId));
    }
  }

  // --- Part F: Audit log ---
  await db.insert(auditLog).values({
    userId: params.adminUserId,
    action: "booking_cancel",
    entityType: "booking",
    entityId: params.bookingId,
    changes: JSON.stringify({
      bookingNumber: booking.bookingNumber,
      previousStatus,
      newStatus: "cancelled",
      reason: params.reason || null,
      refundStatus,
      performRefund: params.performRefund,
    }),
  });

  // --- Part G: Send customer cancellation email ---
  try {
    if (customer.email) {
      const { sendBookingCancellationEmail } = await import(
        "./_core/bookingNotifications"
      );
      await sendBookingCancellationEmail({
        bookingNumber: booking.bookingNumber,
        customerName: customer.name || "Customer",
        customerEmail: customer.email,
        centreName: centre.name,
        siteNumber: site.siteNumber,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: booking.totalAmount,
        companyName: profile?.companyName || undefined,
        tradingName: profile?.tradingName || undefined,
        cancellationReason: params.reason,
        refundStatus: refundStatus || "not_required",
      });
    }
  } catch (emailError) {
    console.error(
      `[CancellationService] Failed to send cancellation email for booking ${booking.bookingNumber}:`,
      emailError,
    );
  }

  return {
    success: true,
    bookingNumber: booking.bookingNumber,
    refundStatus,
  };
}
