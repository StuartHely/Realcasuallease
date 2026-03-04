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

    // --- Idempotency (CL only) ---------------------------------------------
    if (assetType === "cl" && (booking as any).invoiceDispatchedAt !== null) {
      console.log("[DocumentDispatch] Already dispatched, skipping:", bookingId);
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

    // --- Generate Invoice PDF (invoice payment method only) ------------------
    let invoicePdfBase64: string | null = null;
    if ((booking as any).paymentMethod === "invoice") {
      const invoiceGen = await import("./invoiceGenerator");
      if (assetType === "cl") {
        invoicePdfBase64 = await invoiceGen.generateInvoicePDF(bookingId);
      } else if (assetType === "vs") {
        invoicePdfBase64 = await invoiceGen.generateVSInvoicePDF(bookingId);
      } else {
        invoicePdfBase64 = await invoiceGen.generateTLIInvoicePDF(bookingId);
      }
    }

    // --- Assign signing token -----------------------------------------------
    const { assignLicenceToken } = await import("./licenceService");
    const token = await assignLicenceToken(bookingId, assetType);
    const signingUrl = `${ENV.appUrl}/sign/${token}`;

    // --- Build email --------------------------------------------------------
    const bookingNumber = booking.bookingNumber;
    const hasInvoice = invoicePdfBase64 !== null;
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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #123047;">Your Licence Agreement${hasInvoice ? " & Invoice" : ""}</h2>

        <p>Dear ${customer.name || "Valued Customer"},</p>

        <p>
          Please find your Licence Agreement${hasInvoice ? " and Invoice" : ""} attached for
          booking <strong>${bookingNumber}</strong>.
        </p>

        <p>To proceed, please review and sign the Licence Agreement using the button below:</p>

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
          <strong>Casual Lease Team</strong>
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
  } catch (error) {
    console.error("[DocumentDispatch] Failed for booking", bookingId, error);
  }
}
