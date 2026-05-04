import type { Express, Request, Response } from "express";
import { authService } from "./authService";
import { sdk } from "./sdk";
import { getBookingById } from "../db";
import { generateLicencePDFForBooking } from "../licenceGenerator";

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
 * Register GET /api/licence/:bookingId — returns the latest Licence Agreement PDF
 * for a casual-leasing booking. If the licence has been e-signed, the PDF
 * includes the signature block; otherwise it shows "Awaiting signature".
 *
 * Auth: same cookie session as tRPC. Customers may fetch only their own booking;
 * staff/owners may fetch any.
 */
export function registerLicenceRoutes(app: Express) {
  app.get("/api/licence/:bookingId", async (req: Request, res: Response) => {
    try {
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

      const base64 = await generateLicencePDFForBooking(bookingId);
      const pdfBuffer = Buffer.from(base64, "base64");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="licence-${booking.bookingNumber || bookingId}.pdf"`
      );
      res.setHeader("Cache-Control", "no-store");
      return res.send(pdfBuffer);
    } catch (err) {
      console.error("[LicenceRoute] Error generating licence PDF:", err);
      return res.status(500).send("Failed to generate licence");
    }
  });
}
