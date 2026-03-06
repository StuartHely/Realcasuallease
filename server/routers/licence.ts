import { publicProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import {
  bookings as bookingsTable,
  vacantShopBookings,
  vacantShops,
  thirdLineBookings,
  thirdLineIncome,
  shoppingCentres,
} from "../../drizzle/schema";
import {
  findBookingByToken,
  recordSignature,
  getLicenceStatus,
  assignLicenceToken,
} from "../licenceService";
import { getConfigValue, setConfigValue } from "../systemConfigDb";

const LICENCE_CONFIG_KEY = "licence_terms_and_conditions";

export const licenceRouter = router({
  getByToken: publicProcedure
    .input(z.object({ token: z.string().length(64) }))
    .query(async ({ input }) => {
      const booking = await findBookingByToken(input.token);
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found for this token" });
      }

      let centreName = "";
      let assetNumber = "";
      let customerName = "";

      if (booking.assetType === "cl") {
        const fullBooking = await db.getBookingById(booking.id);
        if (fullBooking) {
          const site = await db.getSiteById(fullBooking.siteId);
          if (site) {
            assetNumber = site.siteNumber;
            const centre = await db.getShoppingCentreById(site.centreId);
            if (centre) centreName = centre.name;
          }
          const customer = await db.getUserById(fullBooking.customerId);
          if (customer) customerName = customer.name ?? "";
        }
      } else if (booking.assetType === "vs") {
        const drizzle = await getDb();
        if (drizzle) {
          const [vsBooking] = await drizzle
            .select({ vacantShopId: vacantShopBookings.vacantShopId, customerId: vacantShopBookings.customerId })
            .from(vacantShopBookings)
            .where(eq(vacantShopBookings.id, booking.id));
          if (vsBooking) {
            const [shop] = await drizzle
              .select({ shopNumber: vacantShops.shopNumber, centreId: vacantShops.centreId })
              .from(vacantShops)
              .where(eq(vacantShops.id, vsBooking.vacantShopId));
            if (shop) {
              assetNumber = shop.shopNumber;
              const [centre] = await drizzle
                .select({ name: shoppingCentres.name })
                .from(shoppingCentres)
                .where(eq(shoppingCentres.id, shop.centreId));
              if (centre) centreName = centre.name;
            }
            const customer = await db.getUserById(vsBooking.customerId);
            if (customer) customerName = customer.name ?? "";
          }
        }
      } else if (booking.assetType === "tli") {
        const drizzle = await getDb();
        if (drizzle) {
          const [tliBooking] = await drizzle
            .select({ thirdLineIncomeId: thirdLineBookings.thirdLineIncomeId, customerId: thirdLineBookings.customerId })
            .from(thirdLineBookings)
            .where(eq(thirdLineBookings.id, booking.id));
          if (tliBooking) {
            const [asset] = await drizzle
              .select({ assetNumber: thirdLineIncome.assetNumber, centreId: thirdLineIncome.centreId })
              .from(thirdLineIncome)
              .where(eq(thirdLineIncome.id, tliBooking.thirdLineIncomeId));
            if (asset) {
              assetNumber = asset.assetNumber;
              const [centre] = await drizzle
                .select({ name: shoppingCentres.name })
                .from(shoppingCentres)
                .where(eq(shoppingCentres.id, asset.centreId));
              if (centre) centreName = centre.name;
            }
            const customer = await db.getUserById(tliBooking.customerId);
            if (customer) customerName = customer.name ?? "";
          }
        }
      }

      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        assetType: booking.assetType,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: booking.totalAmount,
        gstAmount: booking.gstAmount,
        status: booking.status,
        licenceSignedAt: booking.licenceSignedAt,
        centreName,
        assetNumber,
        customerName,
      };
    }),

  sign: publicProcedure
    .input(z.object({
      token: z.string().length(64),
      signedByName: z.string().min(2).max(255),
    }))
    .mutation(async ({ input, ctx }) => {
      const ip =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        ctx.req.ip ||
        "unknown";

      const success = await recordSignature(input.token, input.signedByName, ip);
      if (!success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unable to record signature. Token not found or already signed.",
        });
      }

      return { success: true };
    }),

  getTerms: publicProcedure.query(async () => {
    const terms = await getConfigValue(LICENCE_CONFIG_KEY);
    if (terms) return { terms };

    const defaultTerms = `<h2>Terms and Conditions</h2>
<p>1. The Licensee acknowledges that this Licence does not create a tenancy and the Licensee has no rights under the Retail Leases Act.</p>
<p>2. The Licensee must use the Licensed Area only for the Permitted Use specified in this Agreement.</p>
<p>3. The Licensee must comply with all reasonable directions of the Licensor and Centre Management.</p>
<p>4. The Licensee must maintain public liability insurance of not less than $20,000,000 for the duration of the Licence.</p>
<p>5. The Licensee must keep the Licensed Area clean, tidy and in good condition.</p>
<p>6. The Licensee must not make any alterations to the Licensed Area without the prior written consent of the Licensor.</p>
<p>7. The Licensee must not assign or sub-licence the Licensed Area.</p>
<p>8. The Licensor may terminate this Licence immediately if the Licensee breaches any term of this Agreement.</p>
<p>9. Upon termination, the Licensee must vacate the Licensed Area and remove all belongings.</p>
<p>10. The Licensee indemnifies the Licensor against all claims arising from the Licensee's use of the Licensed Area.</p>`;

    await setConfigValue(LICENCE_CONFIG_KEY, defaultTerms);
    return { terms: defaultTerms };
  }),

  getStatus: ownerProcedure
    .input(z.object({
      bookingId: z.number(),
      assetType: z.enum(["cl", "vs", "tli"]),
    }))
    .query(async ({ input }) => {
      const status = await getLicenceStatus(input.bookingId, input.assetType);
      if (!status) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      return status;
    }),

  getTermsAdmin: adminProcedure.query(async () => {
    const terms = await getConfigValue(LICENCE_CONFIG_KEY);
    return { terms: terms ?? "" };
  }),

  updateTerms: adminProcedure
    .input(z.object({ terms: z.string() }))
    .mutation(async ({ input }) => {
      await setConfigValue(LICENCE_CONFIG_KEY, input.terms);
      return { success: true };
    }),

  resendSigningLink: ownerProcedure
    .input(z.object({
      bookingId: z.number(),
      assetType: z.enum(["cl", "vs", "tli"]),
    }))
    .mutation(async ({ input }) => {
      const token = await assignLicenceToken(input.bookingId, input.assetType);

      // Resolve customer email from the booking
      const table =
        input.assetType === "cl"
          ? bookingsTable
          : input.assetType === "vs"
            ? vacantShopBookings
            : thirdLineBookings;

      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [booking] = await dbInstance
        .select({ customerId: table.customerId, bookingNumber: table.bookingNumber })
        .from(table)
        .where(eq(table.id, input.bookingId));

      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      const customer = await db.getUserById(booking.customerId);
      if (!customer?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Customer has no email" });

      // Resolve owner for branding
      let emailOwnerId: number | null = null;
      try {
        if (input.assetType === "cl") {
          const fullBooking = await db.getBookingById(input.bookingId);
          if (fullBooking) {
            const site = await db.getSiteById(fullBooking.siteId);
            if (site) {
              const centre = await db.getShoppingCentreById(site.centreId);
              emailOwnerId = centre?.ownerId ?? null;
            }
          }
        } else if (input.assetType === "vs") {
          const [vsBooking] = await dbInstance
            .select({ vacantShopId: vacantShopBookings.vacantShopId })
            .from(vacantShopBookings)
            .where(eq(vacantShopBookings.id, input.bookingId));
          if (vsBooking) {
            const [shop] = await dbInstance
              .select({ centreId: vacantShops.centreId })
              .from(vacantShops)
              .where(eq(vacantShops.id, vsBooking.vacantShopId));
            if (shop) {
              const centre = await db.getShoppingCentreById(shop.centreId);
              emailOwnerId = centre?.ownerId ?? null;
            }
          }
        } else {
          const [tliBooking] = await dbInstance
            .select({ thirdLineIncomeId: thirdLineBookings.thirdLineIncomeId })
            .from(thirdLineBookings)
            .where(eq(thirdLineBookings.id, input.bookingId));
          if (tliBooking) {
            const [asset] = await dbInstance
              .select({ centreId: thirdLineIncome.centreId })
              .from(thirdLineIncome)
              .where(eq(thirdLineIncome.id, tliBooking.thirdLineIncomeId));
            if (asset) {
              const centre = await db.getShoppingCentreById(asset.centreId);
              emailOwnerId = centre?.ownerId ?? null;
            }
          }
        }
      } catch {}

      const { ENV } = await import("../_core/env");
      const { getOperatorAppUrl } = await import("../tenantScope");
      const appUrl = emailOwnerId ? await getOperatorAppUrl(emailOwnerId) : ENV.appUrl;
      const signingUrl = `${appUrl}/sign/${token}`;

      const { getOperatorBranding } = await import("../_core/emailTemplate");
      const branding = await getOperatorBranding(emailOwnerId);

      const { sendEmail } = await import("../_core/email");
      await sendEmail({
        to: customer.email,
        subject: `Licence Agreement Reminder: ${booking.bookingNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #123047;">Licence Agreement Reminder</h2>
            <p>Dear ${customer.name || "Valued Customer"},</p>
            <p>This is a reminder to review and sign your Licence Agreement for booking <strong>${booking.bookingNumber}</strong>.</p>
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
            <p style="margin-top: 30px;">Best regards,<br><strong>${branding.teamName}</strong></p>
          </div>
        `,
      });

      return { token, signingUrl };
    }),
});
