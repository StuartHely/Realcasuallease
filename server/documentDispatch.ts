import { getDb } from "./db";
import { bookings, vacantShopBookings, thirdLineBookings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import type { AssetType } from "./licenceService";

/**
 * Combined document dispatch — generates licence PDF + optional invoice PDF,
 * assigns a signing token, and sends a single email with all attachments.
 *
 * This function NEVER throws — all errors are caught and logged (fire-and-forget).
 */
export async function dispatchBookingDocuments(
  bookingId: number,
  assetType: AssetType,
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[DocumentDispatch] Database not available");
      return;
    }

    // --- Load booking row ---------------------------------------------------
    const table =
      assetType === "cl"
        ? bookings
        : assetType === "vs"
          ? vacantShopBookings
          : thirdLineBookings;

    const [booking] = await db.select().from(table).where(eq(table.id, bookingId));
    if (!booking) {
      console.error("[DocumentDispatch] Booking not found:", bookingId);
      return;
    }

    // --- Resolve owner for branding -------------------------------------------
    let emailOwnerId: number | null = null;
    try {
      const { getShoppingCentreById, getSiteById } = await import("./db");
      if (assetType === "cl") {
        const site = await getSiteById((booking as any).siteId);
        if (site) {
          const centre = await getShoppingCentreById(site.centreId);
          emailOwnerId = centre?.ownerId ?? null;
        }
      } else if (assetType === "vs") {
        const { getVacantShopById } = await import("./assetDb");
        const shop = await getVacantShopById((booking as any).vacantShopId);
        if (shop) {
          const centre = await getShoppingCentreById(shop.centreId);
          emailOwnerId = centre?.ownerId ?? null;
        }
      } else {
        const { getThirdLineIncomeById } = await import("./assetDb");
        const asset = await getThirdLineIncomeById((booking as any).thirdLineIncomeId);
        if (asset) {
          const centre = await getShoppingCentreById(asset.centreId);
          emailOwnerId = centre?.ownerId ?? null;
        }
      }
    } catch {}

    // --- Idempotency: skip if already dispatched -----------------------------
    if (assetType === "cl" && (booking as any).invoiceDispatchedAt !== null) {
      console.log("[DocumentDispatch] Already dispatched, skipping:", bookingId);
      return;
    }
    if ((assetType === "vs" || assetType === "tli") && (booking as any).licenceSignatureToken) {
      console.log("[DocumentDispatch] Already dispatched (token exists), skipping:", bookingId);
      return;
    }

    // --- Resolve customer email ---------------------------------------------
    const { getUserById } = await import("./db");
    const customer = await getUserById(booking.customerId);
    if (!customer || !customer.email) {
      console.error("[DocumentDispatch] Customer or email not found:", booking.customerId);
      return;
    }

    // --- Generate Licence PDF -----------------------------------------------
    const {
      generateLicencePDFForBooking,
      generateLicencePDFForVSBooking,
      generateLicencePDFForTLIBooking,
    } = await import("./licenceGenerator");

    let licencePdfBase64: string;
    if (assetType === "cl") {
      licencePdfBase64 = await generateLicencePDFForBooking(bookingId);
    } else if (assetType === "vs") {
      licencePdfBase64 = await generateLicencePDFForVSBooking(bookingId);
    } else {
      licencePdfBase64 = await generateLicencePDFForTLIBooking(bookingId);
    }

    // --- Generate Invoice PDF (all bookings get invoice for records) ---------
    let invoicePdfBase64: string | null = null;
    try {
      const invoiceGen = await import("./invoiceGenerator");
      if (assetType === "cl") {
        invoicePdfBase64 = await invoiceGen.generateInvoicePDF(bookingId);
      } else if (assetType === "vs") {
        invoicePdfBase64 = await invoiceGen.generateVSInvoicePDF(bookingId);
      } else {
        invoicePdfBase64 = await invoiceGen.generateTLIInvoicePDF(bookingId);
      }
    } catch (invoiceError) {
      console.error("[DocumentDispatch] Invoice generation failed, continuing without:", invoiceError);
    }

    // --- Create Stripe Checkout Session (stripe payment method only) ---------
    let paymentUrl: string | null = null;
    if ((booking as any).paymentMethod === "stripe") {
      try {
        const { createCheckoutSession } = await import("./stripeService");
        const { getShoppingCentreById, getSiteById } = await import("./db");

        let centreName = "Shopping Centre";
        let assetLabel = `Booking ${booking.bookingNumber}`;
        let bookingType: "site" | "vacant_shop" | "third_line" = "site";

        if (assetType === "cl") {
          const site = await getSiteById((booking as any).siteId);
          const centre = site ? await getShoppingCentreById(site.centreId) : null;
          centreName = centre?.name || centreName;
          assetLabel = `Site ${site?.siteNumber || ""}`;
          bookingType = "site";
        } else if (assetType === "vs") {
          const { getVacantShopById } = await import("./assetDb");
          const shop = await getVacantShopById((booking as any).vacantShopId);
          const centre = shop ? await getShoppingCentreById(shop.centreId) : null;
          centreName = centre?.name || centreName;
          assetLabel = `Shop ${shop?.shopNumber || ""}`;
          bookingType = "vacant_shop";
        } else {
          const { getThirdLineIncomeById } = await import("./assetDb");
          const asset = await getThirdLineIncomeById((booking as any).thirdLineIncomeId);
          const centre = asset ? await getShoppingCentreById(asset.centreId) : null;
          centreName = centre?.name || centreName;
          assetLabel = `Asset ${asset?.assetNumber || ""}`;
          bookingType = "third_line";
        }

        const totalWithGst = Math.round(
          (Number(booking.totalAmount) + Number(booking.gstAmount)) * 100
        );

        const session = await createCheckoutSession({
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          bookingType,
          customerEmail: customer.email || "",
          centreName,
          assetLabel,
          totalAmountCents: totalWithGst,
          startDate: booking.startDate,
          endDate: booking.endDate,
        });
        paymentUrl = session.url;
      } catch (stripeError) {
        console.error("[DocumentDispatch] Failed to create Stripe session:", stripeError);
      }
    }

    // --- Assign signing token -----------------------------------------------
    const { assignLicenceToken } = await import("./licenceService");
    const token = await assignLicenceToken(bookingId, assetType);
    const { getOperatorAppUrl } = await import("./tenantScope");
    const appUrl = emailOwnerId ? await getOperatorAppUrl(emailOwnerId) : ENV.appUrl;
    const signingUrl = `${appUrl}/sign/${token}`;

    // --- Resolve branding ---------------------------------------------------
    const { getOperatorBranding } = await import("./_core/emailTemplate");
    const branding = await getOperatorBranding(emailOwnerId);

    // --- Build email --------------------------------------------------------
    const bookingNumber = booking.bookingNumber;
    const hasInvoice = invoicePdfBase64 !== null;
    const hasPaymentLink = paymentUrl !== null;
    const subject = hasInvoice
      ? `Licence Agreement & Invoice: ${bookingNumber}`
      : `Licence Agreement: ${bookingNumber}`;

    const attachments: Array<{
      filename: string;
      content: string;
      encoding: "base64";
    }> = [
      {
        filename: `Licence-${bookingNumber}.pdf`,
        content: licencePdfBase64,
        encoding: "base64",
      },
    ];

    if (hasInvoice && invoicePdfBase64) {
      attachments.push({
        filename: `Invoice-${bookingNumber}.pdf`,
        content: invoicePdfBase64,
        encoding: "base64",
      });
    }

    const paymentSection = hasPaymentLink
      ? `
        <p>Your booking has been approved! Please complete payment using the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentUrl}"
             style="display: inline-block; padding: 14px 28px; background-color: #2e7d32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Pay Now
          </a>
        </div>

        <p>Then review and sign the Licence Agreement:</p>
      `
      : `
        <p>To proceed, please review and sign the Licence Agreement using the button below:</p>
      `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #123047;">Your Licence Agreement${hasInvoice ? " & Invoice" : ""}</h2>

        <p>Dear ${customer.name || "Valued Customer"},</p>

        <p>
          Please find your Licence Agreement${hasInvoice ? " and Invoice" : ""} attached for
          booking <strong>${bookingNumber}</strong>.
        </p>

        ${paymentSection}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${signingUrl}"
             style="display: inline-block; padding: 14px 28px; background-color: #123047; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Sign Your Licence Agreement
          </a>
        </div>

        <p style="font-size: 13px; color: #555;">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href="${signingUrl}" style="color: #123047;">${signingUrl}</a>
        </p>

        <p>If you have any questions, please don't hesitate to contact us.</p>

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${branding.teamName}</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply directly to this message.
        </p>
      </div>
    `;

    // --- Send email ---------------------------------------------------------
    const { sendEmail } = await import("./_core/email");
    const sent = await sendEmail({
      to: customer.email,
      subject,
      html,
      attachments,
    });

    if (!sent) {
      console.error("[DocumentDispatch] Email send failed for booking:", bookingId);
      return;
    }

    // --- Mark dispatched (CL only) ------------------------------------------
    if (assetType === "cl") {
      await db
        .update(bookings)
        .set({ invoiceDispatchedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    }

    console.log("[DocumentDispatch] Documents dispatched for booking:", bookingId);

    import("./auditHelper").then(m => m.writeAudit({
      action: "invoice_generated",
      entityType: assetType === "cl" ? "booking" : assetType === "vs" ? "vs_booking" : "tli_booking",
      entityId: bookingId,
      changes: { assetType, bookingNumber: (booking as any).bookingNumber },
    })).catch(() => {});
  } catch (error) {
    console.error("[DocumentDispatch] Failed for booking", bookingId, error);
  }
}
