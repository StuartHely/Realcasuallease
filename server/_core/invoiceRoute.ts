import type { Express, Request, Response } from "express";
import { authService } from "./authService";
import { sdk } from "./sdk";
import { getBookingById } from "../db";
import { generateInvoicePDF } from "../invoiceGenerator";

const ALLOWED_ROLES = new Set([
  "mega_admin",
  "mega_state_admin",
  "owner_super_admin",
  "owner_state_admin",
  "owner_regional_admin",
  "owner_centre_manager",
  "owner_marketing_manager",
  "owner_viewer",
]);

/**
 * Register GET /api/invoice/:bookingId — returns a PDF invoice for a booking.
 * Used by the admin Bookings page "Invoice PDF" button (window.open in a new tab).
 *
 * Auth: cookie-based session (same as tRPC). Customers may fetch only their own
 * booking; staff/owners may fetch any.
 */
export function registerInvoiceRoutes(app: Express) {
  app.get("/api/invoice/:bookingId", async (req: Request, res: Response) => {
    try {
      // Authenticate
      let user = await authService.authenticateRequest(req).catch(() => null);
      if (!user) {
        user = await sdk.authenticateRequest(req).catch(() => null);
      }
      if (!user) {
        return res.status(401).send("Unauthorized");
      }

      const bookingId = parseInt(req.params.bookingId, 10);
      if (Number.isNaN(bookingId)) {
        return res.status(400).send("Invalid booking id");
      }

      const booking = await getBookingById(bookingId);
      if (!booking) {
        return res.status(404).send("Booking not found");
      }

      const isStaff = ALLOWED_ROLES.has(user.role);
      const isOwnerOfBooking = booking.customerId === user.id;
      if (!isStaff && !isOwnerOfBooking) {
        return res.status(403).send("Forbidden");
      }

      const base64 = await generateInvoicePDF(bookingId);
      const pdfBuffer = Buffer.from(base64, "base64");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="invoice-${booking.bookingNumber || bookingId}.pdf"`
      );
      res.setHeader("Cache-Control", "no-store");
      return res.send(pdfBuffer);
    } catch (err) {
      console.error("[InvoiceRoute] Error generating invoice PDF:", err);
      return res.status(500).send("Failed to generate invoice");
    }
  });
}
