import { publicProcedure, protectedProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import * as assetDb from "../assetDb";
import { TRPCError } from "@trpc/server";

export const thirdLineCategoriesRouter = router({
  list: publicProcedure.query(async () => {
    return await assetDb.getAllThirdLineCategories();
  }),

  listActive: publicProcedure.query(async () => {
    return await assetDb.getActiveThirdLineCategories();
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await assetDb.createThirdLineCategory(input);
      return { id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await assetDb.updateThirdLineCategory(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await assetDb.deleteThirdLineCategory(input.id);
      return { success: true };
    }),
});

export const vacantShopsRouter = router({
  getByCentre: publicProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input }) => {
      return await assetDb.getVacantShopsByCentre(input.centreId);
    }),

  getActiveByCentre: publicProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input }) => {
      return await assetDb.getActiveVacantShopsByCentre(input.centreId);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const shop = await assetDb.getVacantShopById(input.id);
      if (!shop) throw new TRPCError({ code: "NOT_FOUND", message: "Vacant shop not found" });
      return shop;
    }),

  create: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      shopNumber: z.string().min(1),
      totalSizeM2: z.string().optional(),
      dimensions: z.string().optional(),
      powered: z.boolean().optional(),
      description: z.string().optional(),
      imageUrl1: z.string().optional(),
      imageUrl2: z.string().optional(),
      pricePerWeek: z.string().optional(),
      pricePerMonth: z.string().optional(),
      outgoingsPerDay: z.string().optional(),
      floorLevelId: z.number().nullable().optional(),
      mapMarkerX: z.string().nullable().optional(),
      mapMarkerY: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await assetDb.createVacantShop(input);
      return { id };
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      shopNumber: z.string().min(1).optional(),
      totalSizeM2: z.string().optional(),
      dimensions: z.string().optional(),
      powered: z.boolean().optional(),
      description: z.string().optional(),
      imageUrl1: z.string().optional(),
      imageUrl2: z.string().optional(),
      pricePerWeek: z.string().optional(),
      pricePerMonth: z.string().optional(),
      outgoingsPerDay: z.string().optional(),
      floorLevelId: z.number().nullable().optional(),
      mapMarkerX: z.string().nullable().optional(),
      mapMarkerY: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await assetDb.updateVacantShop(id, data);
      return { success: true };
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await assetDb.deleteVacantShop(input.id);
      return { success: true };
    }),

  uploadImage: ownerProcedure
    .input(z.object({
      shopId: z.number(),
      imageSlot: z.number().min(1).max(2),
      base64Image: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { processAssetImage } = await import('../imageProcessing');
      const { url } = await processAssetImage(
        input.base64Image,
        'vacant-shop',
        input.shopId,
        input.imageSlot
      );
      await assetDb.updateVacantShop(input.shopId, {
        [`imageUrl${input.imageSlot}`]: url,
      } as any);
      return { url };
    }),
});

export const thirdLineIncomeRouter = router({
  getByCentre: publicProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input }) => {
      return await assetDb.getThirdLineIncomeByCentre(input.centreId);
    }),

  getActiveByCentre: publicProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input }) => {
      return await assetDb.getActiveThirdLineIncomeByCentre(input.centreId);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const asset = await assetDb.getThirdLineIncomeById(input.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Third line income asset not found" });
      return asset;
    }),

  create: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      assetNumber: z.string().min(1),
      categoryId: z.number(),
      dimensions: z.string().optional(),
      powered: z.boolean().optional(),
      description: z.string().optional(),
      imageUrl1: z.string().optional(),
      imageUrl2: z.string().optional(),
      pricePerWeek: z.string().optional(),
      pricePerMonth: z.string().optional(),
      outgoingsPerDay: z.string().optional(),
      floorLevelId: z.number().nullable().optional(),
      mapMarkerX: z.string().nullable().optional(),
      mapMarkerY: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await assetDb.createThirdLineIncome(input);
      return { id };
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      assetNumber: z.string().min(1).optional(),
      categoryId: z.number().optional(),
      dimensions: z.string().optional(),
      powered: z.boolean().optional(),
      description: z.string().optional(),
      imageUrl1: z.string().optional(),
      imageUrl2: z.string().optional(),
      pricePerWeek: z.string().optional(),
      pricePerMonth: z.string().optional(),
      outgoingsPerDay: z.string().optional(),
      floorLevelId: z.number().nullable().optional(),
      mapMarkerX: z.string().nullable().optional(),
      mapMarkerY: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await assetDb.updateThirdLineIncome(id, data);
      return { success: true };
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await assetDb.deleteThirdLineIncome(input.id);
      return { success: true };
    }),

  uploadImage: ownerProcedure
    .input(z.object({
      assetId: z.number(),
      imageSlot: z.number().min(1).max(2),
      base64Image: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { processAssetImage } = await import('../imageProcessing');
      const { url } = await processAssetImage(
        input.base64Image,
        'third-line',
        input.assetId,
        input.imageSlot
      );
      await assetDb.updateThirdLineIncome(input.assetId, {
        [`imageUrl${input.imageSlot}`]: url,
      } as any);
      return { url };
    }),
});

export const assetsRouter = router({
  getByCentre: publicProcedure
    .input(z.object({
      centreId: z.number(),
      assetType: z.enum(["casual_leasing", "vacant_shops", "third_line", "all"]).optional(),
    }))
    .query(async ({ input }) => {
      return await assetDb.getAllAssetsByCentre(input.centreId, input.assetType || "all");
    }),
});

export const vacantShopBookingsRouter = router({
  myBookings: protectedProcedure.query(async ({ ctx }) => {
    return await assetDb.getVacantShopBookingsByCustomerId(ctx.user.id);
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const booking = await assetDb.getVacantShopBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (booking.customerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your booking" });
      }
      if (booking.paymentMethod !== "stripe") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This booking does not use Stripe payment" });
      }
      if (booking.paidAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is already paid" });
      }
      if (booking.status === "cancelled" || booking.status === "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot pay for a cancelled or rejected booking" });
      }

      const shop = await assetDb.getVacantShopById(booking.vacantShopId);
      const centre = shop ? await db.getShoppingCentreById(shop.centreId) : null;
      const customer = await db.getUserById(ctx.user.id);

      const totalWithGst = Math.round(
        (Number(booking.totalAmount) + Number(booking.gstAmount)) * 100
      );

      const { createCheckoutSession } = await import("../stripeService");
      const session = await createCheckoutSession({
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        bookingType: "vacant_shop",
        customerEmail: customer?.email || "",
        centreName: centre?.name || "Shopping Centre",
        assetLabel: `Shop ${shop?.shopNumber || ""}`,
        totalAmountCents: totalWithGst,
        startDate: booking.startDate,
        endDate: booking.endDate,
      });

      return { url: session.url };
    }),

  customerCancel: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const booking = await assetDb.getVacantShopBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (booking.customerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your booking" });
      }
      if (booking.status === "cancelled" || booking.status === "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is already cancelled" });
      }
      if (booking.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Completed bookings cannot be cancelled" });
      }

      await assetDb.updateVacantShopBooking(input.bookingId, { status: "cancelled" });

      const { logAssetBookingStatusChange } = await import("../bookingStatusHelper");
      await logAssetBookingStatusChange({
        entityType: "vacant_shop_booking",
        entityId: input.bookingId,
        previousStatus: booking.status,
        newStatus: "cancelled",
        changedBy: ctx.user.id,
        reason: input.reason || "Cancelled by customer",
      });

      // Create reversal transaction if a booking transaction exists
      const { getDb } = await import("../db");
      const { transactions, vacantShops, shoppingCentres } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (dbInstance) {
        const [originalTx] = await dbInstance.select().from(transactions)
          .where(eq(transactions.bookingId, input.bookingId));
        if (originalTx && originalTx.type === "booking") {
          const [shop] = await dbInstance.select().from(vacantShops).where(eq(vacantShops.id, booking.vacantShopId));
          const centreId = shop?.centreId;
          const [centre] = centreId
            ? await dbInstance.select().from(shoppingCentres).where(eq(shoppingCentres.id, centreId))
            : [null];
          if (centre) {
            await dbInstance.insert(transactions).values({
              bookingId: input.bookingId,
              ownerId: centre.ownerId,
              type: "cancellation",
              amount: `-${originalTx.amount}` as any,
              gstAmount: `-${originalTx.gstAmount}` as any,
              gstPercentage: originalTx.gstPercentage,
              ownerAmount: `-${originalTx.ownerAmount}` as any,
              platformFee: `-${originalTx.platformFee}` as any,
              remitted: false,
              gstAdjustmentNoteNumber: `CN-${booking.bookingNumber}`,
            });
          }
        }
      }

      return { success: true, bookingNumber: booking.bookingNumber };
    }),

  list: ownerProcedure
    .input(z.object({
      status: z.enum(["pending", "confirmed", "cancelled", "completed", "rejected"]).optional(),
    }))
    .query(async ({ input }) => {
      return await assetDb.listVacantShopBookings(input.status);
    }),

  getByShop: publicProcedure
    .input(z.object({ vacantShopId: z.number() }))
    .query(async ({ input }) => {
      return await assetDb.getVacantShopBookingsByShop(input.vacantShopId);
    }),

  getByCentre: publicProcedure
    .input(z.object({
      centreId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return await assetDb.getVacantShopBookingsByCentre(input.centreId, input.startDate, input.endDate);
    }),

  checkAvailability: publicProcedure
    .input(z.object({
      vacantShopId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
      excludeBookingId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const isAvailable = await assetDb.checkVacantShopAvailability(
        input.vacantShopId,
        input.startDate,
        input.endDate,
        input.excludeBookingId
      );
      return { available: isAvailable };
    }),

  getAvailabilityCalendar: publicProcedure
    .input(z.object({
      centreId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      return await assetDb.getVacantShopAvailabilityCalendar(
        input.centreId,
        input.startDate,
        input.endDate
      );
    }),

  create: protectedProcedure
    .input(z.object({
      vacantShopId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
      totalAmount: z.string(),
      customerNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check availability first
      const isAvailable = await assetDb.checkVacantShopAvailability(
        input.vacantShopId,
        input.startDate,
        input.endDate
      );

      if (!isAvailable) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This vacant shop is not available for the selected dates",
        });
      }

      // Generate booking number
      const bookingNumber = await assetDb.generateVacantShopBookingNumber(input.vacantShopId);

      // Get shop details for email and payment mode resolution
      const shop = await assetDb.getVacantShopById(input.vacantShopId);
      const centre = shop ? await db.getShoppingCentreById(shop.centreId) : null;

      // Calculate GST from system config
      const { getConfigValue } = await import("../systemConfigDb");
      const gstValue = await getConfigValue("gst_percentage");
      const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
      const totalAmountNum = Number(input.totalAmount);
      const gstAmount = totalAmountNum * gstRate;

      // Calculate owner/platform fee split from owner's VS commission
      const owner = centre ? await db.getOwnerById(centre.ownerId) : null;
      const commissionRate = owner ? Number(owner.commissionVs ?? owner.commissionPercentage) / 100 : 0;
      const platformFee = totalAmountNum * commissionRate;
      const ownerAmount = totalAmountNum - platformFee;

      // Resolve payment method server-side
      const currentUser = await db.getUserById(ctx.user.id);
      const { resolvePaymentMethod } = await import("../paymentModeHelper");
      const paymentMethod = resolvePaymentMethod(
        centre?.paymentMode || "stripe",
        currentUser?.canPayByInvoice || false,
      );

      const id = await assetDb.createVacantShopBooking({
        bookingNumber,
        vacantShopId: input.vacantShopId,
        customerId: ctx.user.id,
        startDate: input.startDate,
        endDate: input.endDate,
        totalAmount: input.totalAmount,
        gstAmount: gstAmount.toFixed(2),
        gstPercentage: (gstRate * 100).toFixed(2),
        ownerAmount: ownerAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        customerNotes: input.customerNotes,
        customerEmail: ctx.user.email || undefined,
        paymentMethod,
        status: "pending",
        requiresApproval: false,
      });

      // Send enquiry email notification
      if (shop && ctx.user.email) {
        const { sendVacantShopEnquiryEmail } = await import("../_core/bookingNotifications");
        const centre = await db.getShoppingCentreById(shop.centreId);
        await sendVacantShopEnquiryEmail(
          shop.shopNumber,
          ctx.user.name || "Valued Customer",
          ctx.user.email,
          centre?.name || "Shopping Centre",
          input.startDate,
          input.endDate,
          input.customerNotes || ""
        );
      }

      return { id, bookingNumber, paymentMethod };
    }),

  updateStatus: ownerProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "cancelled", "completed", "rejected"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await assetDb.getVacantShopBookingById(input.id);
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      const updateData: any = { status: input.status };

      if (input.status === "confirmed") {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedAt = new Date();
      }

      if (input.status === "rejected" && input.rejectionReason) {
        updateData.rejectionReason = input.rejectionReason;
      }

      await assetDb.updateVacantShopBooking(input.id, updateData);

      // Log status change to audit trail
      const { logAssetBookingStatusChange } = await import("../bookingStatusHelper");
      await logAssetBookingStatusChange({
        entityType: "vacant_shop_booking",
        entityId: input.id,
        previousStatus: booking.status,
        newStatus: input.status,
        changedBy: ctx.user.id,
        reason: input.rejectionReason,
      });

      // Send confirmation email
      if (input.status === "confirmed" && booking.customerEmail) {
        const shop = await assetDb.getVacantShopById(booking.vacantShopId);
        const centre = await db.getShoppingCentreById(shop?.centreId || 0);
        const { sendVSThirdLineConfirmationEmail } = await import("../_core/bookingNotifications");
        await sendVSThirdLineConfirmationEmail(
          "vacant_shop",
          shop?.shopNumber || "Vacant Shop",
          booking.customerEmail,
          booking.customerEmail,
          centre?.name || "Shopping Centre",
          booking.startDate,
          booking.endDate,
          booking.totalAmount
        );
      }

      // Fire-and-forget invoice dispatch when confirmed
      if (input.status === "confirmed") {
        import("../invoiceDispatch").then(m => m.dispatchInvoiceIfRequired(input.id)).catch(() => {});
      }

      // Send rejection email
      if (input.status === "rejected" && booking.customerEmail && input.rejectionReason) {
        const shop = await assetDb.getVacantShopById(booking.vacantShopId);
        const centre = await db.getShoppingCentreById(shop?.centreId || 0);
        const { sendVSThirdLineRejectionEmail } = await import("../_core/bookingNotifications");
        await sendVSThirdLineRejectionEmail(
          "vacant_shop",
          shop?.shopNumber || "Vacant Shop",
          booking.customerEmail,
          booking.customerEmail,
          centre?.name || "Shopping Centre",
          booking.startDate,
          booking.endDate,
          input.rejectionReason
        );
      }

      return { success: true };
    }),
});

export const thirdLineBookingsRouter = router({
  myBookings: protectedProcedure.query(async ({ ctx }) => {
    return await assetDb.getThirdLineBookingsByCustomerId(ctx.user.id);
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const booking = await assetDb.getThirdLineBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (booking.customerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your booking" });
      }
      if (booking.paymentMethod !== "stripe") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This booking does not use Stripe payment" });
      }
      if (booking.paidAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is already paid" });
      }
      if (booking.status === "cancelled" || booking.status === "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot pay for a cancelled or rejected booking" });
      }

      const asset = await assetDb.getThirdLineIncomeById(booking.thirdLineIncomeId);
      const centre = asset ? await db.getShoppingCentreById(asset.centreId) : null;
      const customer = await db.getUserById(ctx.user.id);

      const totalWithGst = Math.round(
        (Number(booking.totalAmount) + Number(booking.gstAmount)) * 100
      );

      const { createCheckoutSession } = await import("../stripeService");
      const session = await createCheckoutSession({
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        bookingType: "third_line",
        customerEmail: customer?.email || "",
        centreName: centre?.name || "Shopping Centre",
        assetLabel: `Asset ${asset?.assetNumber || ""}`,
        totalAmountCents: totalWithGst,
        startDate: booking.startDate,
        endDate: booking.endDate,
      });

      return { url: session.url };
    }),

  customerCancel: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const booking = await assetDb.getThirdLineBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (booking.customerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your booking" });
      }
      if (booking.status === "cancelled" || booking.status === "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is already cancelled" });
      }
      if (booking.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Completed bookings cannot be cancelled" });
      }

      await assetDb.updateThirdLineBooking(input.bookingId, { status: "cancelled" });

      const { logAssetBookingStatusChange } = await import("../bookingStatusHelper");
      await logAssetBookingStatusChange({
        entityType: "third_line_booking",
        entityId: input.bookingId,
        previousStatus: booking.status,
        newStatus: "cancelled",
        changedBy: ctx.user.id,
        reason: input.reason || "Cancelled by customer",
      });

      // Create reversal transaction if a booking transaction exists
      const { getDb } = await import("../db");
      const { transactions, thirdLineIncome, shoppingCentres } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (dbInstance) {
        const [originalTx] = await dbInstance.select().from(transactions)
          .where(eq(transactions.bookingId, input.bookingId));
        if (originalTx && originalTx.type === "booking") {
          const [asset] = await dbInstance.select().from(thirdLineIncome).where(eq(thirdLineIncome.id, booking.thirdLineIncomeId));
          const centreId = asset?.centreId;
          const [centre] = centreId
            ? await dbInstance.select().from(shoppingCentres).where(eq(shoppingCentres.id, centreId))
            : [null];
          if (centre) {
            await dbInstance.insert(transactions).values({
              bookingId: input.bookingId,
              ownerId: centre.ownerId,
              type: "cancellation",
              amount: `-${originalTx.amount}` as any,
              gstAmount: `-${originalTx.gstAmount}` as any,
              gstPercentage: originalTx.gstPercentage,
              ownerAmount: `-${originalTx.ownerAmount}` as any,
              platformFee: `-${originalTx.platformFee}` as any,
              remitted: false,
              gstAdjustmentNoteNumber: `CN-${booking.bookingNumber}`,
            });
          }
        }
      }

      return { success: true, bookingNumber: booking.bookingNumber };
    }),

  list: ownerProcedure
    .input(z.object({
      status: z.enum(["pending", "confirmed", "cancelled", "completed", "rejected"]).optional(),
    }))
    .query(async ({ input }) => {
      return await assetDb.listThirdLineBookings(input.status);
    }),

  getByAsset: publicProcedure
    .input(z.object({ thirdLineIncomeId: z.number() }))
    .query(async ({ input }) => {
      return await assetDb.getThirdLineBookingsByAsset(input.thirdLineIncomeId);
    }),

  getByCentre: publicProcedure
    .input(z.object({
      centreId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return await assetDb.getThirdLineBookingsByCentre(input.centreId, input.startDate, input.endDate);
    }),

  checkAvailability: publicProcedure
    .input(z.object({
      thirdLineIncomeId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
      excludeBookingId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const isAvailable = await assetDb.checkThirdLineAvailability(
        input.thirdLineIncomeId,
        input.startDate,
        input.endDate,
        input.excludeBookingId
      );
      return { available: isAvailable };
    }),

  getAvailabilityCalendar: publicProcedure
    .input(z.object({
      centreId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      return await assetDb.getThirdLineAvailabilityCalendar(
        input.centreId,
        input.startDate,
        input.endDate
      );
    }),

  create: protectedProcedure
    .input(z.object({
      thirdLineIncomeId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
      totalAmount: z.string(),
      customerNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check availability first
      const isAvailable = await assetDb.checkThirdLineAvailability(
        input.thirdLineIncomeId,
        input.startDate,
        input.endDate
      );

      if (!isAvailable) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This third line asset is not available for the selected dates",
        });
      }

      // Generate booking number
      const bookingNumber = await assetDb.generateThirdLineBookingNumber(input.thirdLineIncomeId);

      // Get asset details for email and payment mode resolution
      const asset = await assetDb.getThirdLineIncomeById(input.thirdLineIncomeId);
      const centre = asset ? await db.getShoppingCentreById(asset.centreId) : null;

      // Calculate GST from system config
      const { getConfigValue } = await import("../systemConfigDb");
      const gstValue = await getConfigValue("gst_percentage");
      const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
      const totalAmountNum = Number(input.totalAmount);
      const gstAmount = totalAmountNum * gstRate;

      // Calculate owner/platform fee split from owner's TLI commission
      const owner = centre ? await db.getOwnerById(centre.ownerId) : null;
      const commissionRate = owner ? Number(owner.commissionTli ?? owner.commissionPercentage) / 100 : 0;
      const platformFee = totalAmountNum * commissionRate;
      const ownerAmount = totalAmountNum - platformFee;

      // Resolve payment method server-side
      const currentUser = await db.getUserById(ctx.user.id);
      const { resolvePaymentMethod } = await import("../paymentModeHelper");
      const paymentMethod = resolvePaymentMethod(
        centre?.paymentMode || "stripe",
        currentUser?.canPayByInvoice || false,
      );

      const id = await assetDb.createThirdLineBooking({
        bookingNumber,
        thirdLineIncomeId: input.thirdLineIncomeId,
        customerId: ctx.user.id,
        startDate: input.startDate,
        endDate: input.endDate,
        totalAmount: input.totalAmount,
        gstAmount: gstAmount.toFixed(2),
        gstPercentage: (gstRate * 100).toFixed(2),
        ownerAmount: ownerAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        customerNotes: input.customerNotes,
        customerEmail: ctx.user.email || undefined,
        paymentMethod,
        status: "pending",
        requiresApproval: false,
      });

      // Send enquiry email notification
      if (asset && ctx.user.email) {
        const { sendThirdLineEnquiryEmail } = await import("../_core/bookingNotifications");
        const centre = await db.getShoppingCentreById(asset.centreId);
        const categoryName = asset.categoryName || "Third Line Asset";
        await sendThirdLineEnquiryEmail(
          asset.assetNumber,
          categoryName,
          ctx.user.name || "Valued Customer",
          ctx.user.email,
          centre?.name || "Shopping Centre",
          input.startDate,
          input.endDate,
          input.customerNotes || ""
        );
      }

      return { id, bookingNumber, paymentMethod };
    }),

  updateStatus: ownerProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "cancelled", "completed", "rejected"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await assetDb.getThirdLineBookingById(input.id);
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      const updateData: any = { status: input.status };

      if (input.status === "confirmed") {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedAt = new Date();
      }

      if (input.status === "rejected" && input.rejectionReason) {
        updateData.rejectionReason = input.rejectionReason;
      }

      await assetDb.updateThirdLineBooking(input.id, updateData);

      // Log status change to audit trail
      const { logAssetBookingStatusChange } = await import("../bookingStatusHelper");
      await logAssetBookingStatusChange({
        entityType: "third_line_booking",
        entityId: input.id,
        previousStatus: booking.status,
        newStatus: input.status,
        changedBy: ctx.user.id,
        reason: input.rejectionReason,
      });

      // Send confirmation email
      if (input.status === "confirmed" && booking.customerEmail) {
        const asset = await assetDb.getThirdLineIncomeById(booking.thirdLineIncomeId);
        const centre = await db.getShoppingCentreById(asset?.centreId || 0);
        const { sendVSThirdLineConfirmationEmail } = await import("../_core/bookingNotifications");
        await sendVSThirdLineConfirmationEmail(
          "third_line",
          asset?.assetNumber || "Third Line Asset",
          booking.customerEmail,
          booking.customerEmail,
          centre?.name || "Shopping Centre",
          booking.startDate,
          booking.endDate,
          booking.totalAmount,
          asset?.categoryName || undefined
        );
      }

      // Fire-and-forget invoice dispatch when confirmed
      if (input.status === "confirmed") {
        import("../invoiceDispatch").then(m => m.dispatchInvoiceIfRequired(input.id)).catch(() => {});
      }

      // Send rejection email
      if (input.status === "rejected" && booking.customerEmail && input.rejectionReason) {
        const asset = await assetDb.getThirdLineIncomeById(booking.thirdLineIncomeId);
        const centre = await db.getShoppingCentreById(asset?.centreId || 0);
        const { sendVSThirdLineRejectionEmail } = await import("../_core/bookingNotifications");
        await sendVSThirdLineRejectionEmail(
          "third_line",
          asset?.assetNumber || "Third Line Asset",
          booking.customerEmail,
          booking.customerEmail,
          centre?.name || "Shopping Centre",
          booking.startDate,
          booking.endDate,
          input.rejectionReason,
          asset?.categoryName || undefined
        );
      }

      return { success: true };
    }),
});
