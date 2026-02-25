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
      gstAmount: z.string(),
      gstPercentage: z.string(),
      ownerAmount: z.string(),
      platformFee: z.string(),
      customerNotes: z.string().optional(),
      paymentMethod: z.enum(["stripe", "invoice"]).optional(),
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

      // Get shop details for email
      const shop = await assetDb.getVacantShopById(input.vacantShopId);

      const id = await assetDb.createVacantShopBooking({
        bookingNumber,
        vacantShopId: input.vacantShopId,
        customerId: ctx.user.id,
        startDate: input.startDate,
        endDate: input.endDate,
        totalAmount: input.totalAmount,
        gstAmount: input.gstAmount,
        gstPercentage: input.gstPercentage,
        ownerAmount: input.ownerAmount,
        platformFee: input.platformFee,
        customerNotes: input.customerNotes,
        customerEmail: ctx.user.email || undefined,
        paymentMethod: input.paymentMethod || "stripe",
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

      return { id, bookingNumber };
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
      gstAmount: z.string(),
      gstPercentage: z.string(),
      ownerAmount: z.string(),
      platformFee: z.string(),
      customerNotes: z.string().optional(),
      paymentMethod: z.enum(["stripe", "invoice"]).optional(),
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

      // Get asset details for email
      const asset = await assetDb.getThirdLineIncomeById(input.thirdLineIncomeId);

      const id = await assetDb.createThirdLineBooking({
        bookingNumber,
        thirdLineIncomeId: input.thirdLineIncomeId,
        customerId: ctx.user.id,
        startDate: input.startDate,
        endDate: input.endDate,
        totalAmount: input.totalAmount,
        gstAmount: input.gstAmount,
        gstPercentage: input.gstPercentage,
        ownerAmount: input.ownerAmount,
        platformFee: input.platformFee,
        customerNotes: input.customerNotes,
        customerEmail: ctx.user.email || undefined,
        paymentMethod: input.paymentMethod || "stripe",
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

      return { id, bookingNumber };
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
