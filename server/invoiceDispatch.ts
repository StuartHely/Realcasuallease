import { getDb } from "./db";
import { bookings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Idempotent invoice dispatch.
 * Sends the invoice email and marks invoiceDispatchedAt if all conditions are met:
 *   - paymentMethod === "invoice"
 *   - status === "confirmed"
 *   - invoiceDispatchedAt is null (not yet dispatched)
 *
 * This function never throws — failures are logged and swallowed.
 */
export async function dispatchInvoiceIfRequired(bookingId: number): Promise<void> {
  try {
    const { getBookingById } = await import("./db");
    const booking = await getBookingById(bookingId);
    if (!booking) {
      console.error("[InvoiceDispatch] Booking not found:", bookingId);
      return;
    }

    if (booking.paymentMethod !== "invoice") return;
    if (booking.status !== "confirmed") return;
    if (booking.invoiceDispatchedAt !== null) return;

    const { sendInvoiceEmail } = await import("./invoiceEmail");
    await sendInvoiceEmail(bookingId);

    const db = await getDb();
    if (db) {
      await db
        .update(bookings)
        .set({ invoiceDispatchedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    }

    console.log("[InvoiceDispatch] Invoice dispatched for booking:", bookingId);
  } catch (error) {
    console.error("[InvoiceDispatch] Failed for booking", bookingId, error);
  }
}
