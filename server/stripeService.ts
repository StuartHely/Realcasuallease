/**
 * Stripe Checkout Integration
 *
 * Creates Stripe Checkout Sessions for bookings with paymentMethod="stripe".
 * Handles webhook events to mark bookings as paid.
 */

import { ENV } from "./_core/env";

/**
 * Booking type for Stripe metadata routing.
 * Determines which database table the webhook handler updates.
 */
export type StripeBookingType = "site" | "vacant_shop" | "third_line";

/**
 * Create a Stripe Checkout Session for a booking.
 * Returns the session URL for redirect.
 */
export async function createCheckoutSession(params: {
  bookingId: number;
  bookingNumber: string;
  bookingType?: StripeBookingType;
  customerEmail: string;
  centreName: string;
  assetLabel: string; // e.g. "Site 12", "Shop VS-01", "Asset 3L-01"
  totalAmountCents: number; // Amount in cents (AUD)
  startDate: Date;
  endDate: Date;
}): Promise<{ sessionId: string; url: string }> {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(ENV.stripeSecretKey);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: params.totalAmountCents,
          product_data: {
            name: `Casual Lease - ${params.centreName} ${params.assetLabel}`,
            description: `Booking ${params.bookingNumber}\n${formatDate(params.startDate)} – ${formatDate(params.endDate)}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: params.bookingId.toString(),
      bookingNumber: params.bookingNumber,
      bookingType: params.bookingType || "site",
    },
    success_url: `${ENV.appUrl}/my-bookings?payment=success&booking=${params.bookingNumber}`,
    cancel_url: `${ENV.appUrl}/my-bookings?payment=cancelled&booking=${params.bookingNumber}`,
  });

  return { sessionId: session.id, url: session.url! };
}

/**
 * Handle Stripe webhook event for checkout.session.completed.
 * Marks the booking as paid, creates a transaction record for the payment split,
 * updates booking status to "confirmed", and dispatches invoice.
 * Routes to the correct table based on bookingType metadata.
 */
export async function handleCheckoutCompleted(session: {
  id: string;
  payment_intent: string | null;
  metadata: { bookingId?: string; bookingNumber?: string; bookingType?: string } | null;
}): Promise<void> {
  const bookingId = session.metadata?.bookingId
    ? parseInt(session.metadata.bookingId)
    : null;
  if (!bookingId) {
    console.warn("[Stripe Webhook] No bookingId in session metadata:", session.id);
    return;
  }

  const bookingType = (session.metadata?.bookingType || "site") as StripeBookingType;

  const { getDb } = await import("./db");
  const {
    bookings, vacantShopBookings, thirdLineBookings,
    vacantShops, thirdLineIncome,
    transactions, bookingStatusHistory, sites, shoppingCentres,
  } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available");
    return;
  }

  const now = new Date();
  const updateData = {
    paidAt: now,
    stripePaymentIntentId: session.payment_intent || null,
  };

  if (bookingType === "vacant_shop") {
    const [booking] = await db.select().from(vacantShopBookings).where(eq(vacantShopBookings.id, bookingId));
    if (!booking) return;

    // Update payment fields + status
    await db.update(vacantShopBookings)
      .set({ ...updateData, status: booking.status === "pending" ? "confirmed" : booking.status })
      .where(eq(vacantShopBookings.id, bookingId));

    // Create transaction record
    const [shop] = await db.select().from(vacantShops).where(eq(vacantShops.id, booking.vacantShopId));
    if (shop) {
      const [centre] = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, shop.centreId));
      if (centre) {
        await db.insert(transactions).values({
          bookingId: bookingId,
          ownerId: centre.ownerId,
          type: "booking",
          amount: booking.totalAmount,
          gstAmount: booking.gstAmount,
          gstPercentage: booking.gstPercentage,
          ownerAmount: booking.ownerAmount,
          platformFee: booking.platformFee,
          remitted: false,
        });
      }
    }
  } else if (bookingType === "third_line") {
    const [booking] = await db.select().from(thirdLineBookings).where(eq(thirdLineBookings.id, bookingId));
    if (!booking) return;

    await db.update(thirdLineBookings)
      .set({ ...updateData, status: booking.status === "pending" ? "confirmed" : booking.status })
      .where(eq(thirdLineBookings.id, bookingId));

    const [asset] = await db.select().from(thirdLineIncome).where(eq(thirdLineIncome.id, booking.thirdLineIncomeId));
    if (asset) {
      const [centre] = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, asset.centreId));
      if (centre) {
        await db.insert(transactions).values({
          bookingId: bookingId,
          ownerId: centre.ownerId,
          type: "booking",
          amount: booking.totalAmount,
          gstAmount: booking.gstAmount,
          gstPercentage: booking.gstPercentage,
          ownerAmount: booking.ownerAmount,
          platformFee: booking.platformFee,
          remitted: false,
        });
      }
    }
  } else {
    // Standard CL booking
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) return;

    const previousStatus = booking.status;
    const newStatus = previousStatus === "pending" ? "confirmed" : previousStatus;

    await db.update(bookings)
      .set({ ...updateData, status: newStatus as any })
      .where(eq(bookings.id, bookingId));

    // Record status change in history if status changed
    if (previousStatus !== newStatus) {
      await db.insert(bookingStatusHistory).values({
        bookingId,
        previousStatus: previousStatus as any,
        newStatus: newStatus as any,
        changedByName: "Stripe Payment",
        reason: "Payment confirmed via Stripe Checkout",
      });
    }

    // Create transaction record for payment split
    const [site] = await db.select().from(sites).where(eq(sites.id, booking.siteId));
    if (site) {
      const [centre] = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, site.centreId));
      if (centre) {
        await db.insert(transactions).values({
          bookingId,
          ownerId: centre.ownerId,
          type: "booking",
          amount: booking.totalAmount,
          gstAmount: booking.gstAmount,
          gstPercentage: booking.gstPercentage,
          ownerAmount: booking.ownerAmount,
          platformFee: booking.platformFee,
          remitted: false,
        });
      }
    }

    // Fire-and-forget invoice dispatch
    import("./invoiceDispatch").then(m => m.dispatchInvoiceIfRequired(bookingId)).catch(() => {});
  }

  console.log(
    `[Stripe Webhook] ${bookingType} booking ${session.metadata?.bookingNumber || bookingId} marked as paid (PI: ${session.payment_intent})`,
  );
}
