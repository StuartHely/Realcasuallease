import { publicProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import {
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
      const signingUrl = `/licence/sign/${token}`;
      return { token, signingUrl };
    }),
});
