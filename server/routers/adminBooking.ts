import { ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { getConfigValue } from "../systemConfigDb";
import { sendBookingConfirmationEmail } from "../_core/bookingNotifications";

export const adminBookingRouter = router({
  // Get site availability grid for a centre and month
  getAvailabilityGrid: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      year: z.number(),
      month: z.number().min(1).max(12),
    }))
    .query(async ({ input }) => {
      const { getSiteAvailabilityGrid } = await import('../adminBookingDb');
      return await getSiteAvailabilityGrid(input.centreId, input.year, input.month);
    }),

  // Check for booking overlaps
  checkOverlaps: ownerProcedure
    .input(z.object({
      siteId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
      excludeBookingId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { checkBookingOverlaps } = await import('../adminBookingDb');
      return await checkBookingOverlaps(
        input.siteId,
        input.startDate,
        input.endDate,
        input.excludeBookingId
      );
    }),

  // Get users for booking dropdown
  getUsers: ownerProcedure.query(async () => {
    const { getUsersForAdminBooking } = await import('../adminBookingDb');
    return await getUsersForAdminBooking();
  }),

  // Calculate booking cost preview
  calculateCost: ownerProcedure
    .input(z.object({
      siteId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const site = await db.getSiteById(input.siteId);
      if (!site) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });

      const { calculateBookingCost } = await import('../bookingCalculation');
      const { totalAmount, weekdayCount, weekendCount, seasonalDays } = await calculateBookingCost(
        site,
        input.startDate,
        input.endDate
      );

      // Get GST rate
      const gstValue = await getConfigValue('gst_percentage');
      const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
      const gstAmount = totalAmount * gstRate;

      // Get centre and owner for commission
      const centre = await db.getShoppingCentreById(site.centreId);
      if (!centre) throw new TRPCError({ code: 'NOT_FOUND', message: 'Centre not found' });

      const owner = await db.getOwnerById(centre.ownerId);
      if (!owner) throw new TRPCError({ code: 'NOT_FOUND', message: 'Owner not found' });

      const platformFee = totalAmount * (Number(owner.commissionPercentage) / 100);
      const ownerAmount = totalAmount - platformFee;

      return {
        totalAmount,
        gstAmount,
        gstPercentage: gstRate * 100,
        ownerAmount,
        platformFee,
        weekdayCount,
        weekendCount,
        seasonalDays: seasonalDays || [],
        pricePerDay: Number(site.pricePerDay),
        weekendPricePerDay: site.weekendPricePerDay ? Number(site.weekendPricePerDay) : null,
        pricePerWeek: Number(site.pricePerWeek),
      };
    }),

  // Create admin booking
  create: ownerProcedure
    .input(z.object({
      centreId: z.number(),
      siteId: z.number(),
      customerId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
      totalAmount: z.number(),
      tablesRequested: z.number().default(0),
      chairsRequested: z.number().default(0),
      invoiceOverride: z.boolean().default(false),
      adminComments: z.string().optional(),
      usageCategoryId: z.number().optional(),
      additionalCategoryText: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check for overlaps
      const { checkBookingOverlaps, createAdminBooking } = await import('../adminBookingDb');
      const overlaps = await checkBookingOverlaps(input.siteId, input.startDate, input.endDate);
      if (overlaps.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Booking conflicts with existing bookings: ${overlaps.map(o => o.bookingNumber).join(', ')}`,
        });
      }

      // Get site and centre info
      const site = await db.getSiteById(input.siteId);
      if (!site) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });

      const centre = await db.getShoppingCentreById(site.centreId);
      if (!centre) throw new TRPCError({ code: 'NOT_FOUND', message: 'Centre not found' });

      const owner = await db.getOwnerById(centre.ownerId);
      if (!owner) throw new TRPCError({ code: 'NOT_FOUND', message: 'Owner not found' });

      // Get user payment method
      const customer = await db.getUserById(input.customerId);
      if (!customer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });

      // Calculate GST and fees
      const gstValue = await getConfigValue('gst_percentage');
      const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
      const gstAmount = input.totalAmount * gstRate;
      const platformFee = input.totalAmount * (Number(owner.commissionPercentage) / 100);
      const ownerAmount = input.totalAmount - platformFee;

      // Generate booking number
      const { getCentreCodeForBooking } = await import('../centreCodeHelper');
      const centreCode = getCentreCodeForBooking(centre);
      const dateStr = new Date(input.startDate).toISOString().split('T')[0].replace(/-/g, '');
      const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const bookingNumber = `${centreCode}-${dateStr}-${randomSeq}`;

      // Create booking
      const { bookingId } = await createAdminBooking({
        centreId: input.centreId,
        siteId: input.siteId,
        customerId: input.customerId,
        startDate: input.startDate,
        endDate: input.endDate,
        totalAmount: input.totalAmount.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        gstPercentage: (gstRate * 100).toFixed(2),
        ownerAmount: ownerAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        tablesRequested: input.tablesRequested,
        chairsRequested: input.chairsRequested,
        paymentMethod: customer.canPayByInvoice ? 'invoice' : 'stripe',
        invoiceOverride: input.invoiceOverride,
        adminComments: input.adminComments,
        usageCategoryId: input.usageCategoryId,
        additionalCategoryText: input.additionalCategoryText,
        createdByAdminId: ctx.user.id,
        bookingNumber,
      });

      // Send confirmation email
      try {
        if (customer.email) {
          const customerProfile = await db.getCustomerProfileByUserId(customer.id);
          await sendBookingConfirmationEmail({
            bookingNumber,
            customerName: customer.name || 'Customer',
            customerEmail: customer.email,
            centreName: centre.name,
            siteNumber: site.siteNumber,
            startDate: input.startDate,
            endDate: input.endDate,
            totalAmount: input.totalAmount,
            companyName: customerProfile?.companyName || undefined,
            tradingName: customerProfile?.tradingName || undefined,
          });
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      return { bookingId, bookingNumber };
    }),

  // Update admin booking
  update: ownerProcedure
    .input(z.object({
      bookingId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      totalAmount: z.number().optional(),
      tablesRequested: z.number().optional(),
      chairsRequested: z.number().optional(),
      adminComments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bookingId, ...updates } = input;

      // If dates changed, check for overlaps
      if (updates.startDate || updates.endDate) {
        const booking = await db.getBookingById(bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });

        const { checkBookingOverlaps } = await import('../adminBookingDb');
        const overlaps = await checkBookingOverlaps(
          booking.siteId,
          updates.startDate || booking.startDate,
          updates.endDate || booking.endDate,
          bookingId
        );
        if (overlaps.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Date change conflicts with existing bookings: ${overlaps.map(o => o.bookingNumber).join(', ')}`,
          });
        }
      }

      // Recalculate amounts if totalAmount changed
      let gstAmount: string | undefined;
      let ownerAmount: string | undefined;
      let platformFee: string | undefined;

      if (updates.totalAmount !== undefined) {
        const booking = await db.getBookingById(bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });

        const site = await db.getSiteById(booking.siteId);
        if (!site) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });

        const centre = await db.getShoppingCentreById(site.centreId);
        if (!centre) throw new TRPCError({ code: 'NOT_FOUND', message: 'Centre not found' });

        const owner = await db.getOwnerById(centre.ownerId);
        if (!owner) throw new TRPCError({ code: 'NOT_FOUND', message: 'Owner not found' });

        const gstValue = await getConfigValue('gst_percentage');
        const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
        gstAmount = (updates.totalAmount * gstRate).toFixed(2);
        platformFee = (updates.totalAmount * (Number(owner.commissionPercentage) / 100)).toFixed(2);
        ownerAmount = (updates.totalAmount - Number(platformFee)).toFixed(2);
      }

      const { updateAdminBooking } = await import('../adminBookingDb');
      await updateAdminBooking(
        bookingId,
        {
          startDate: updates.startDate,
          endDate: updates.endDate,
          totalAmount: updates.totalAmount?.toFixed(2),
          gstAmount,
          ownerAmount,
          platformFee,
          tablesRequested: updates.tablesRequested,
          chairsRequested: updates.chairsRequested,
          adminComments: updates.adminComments,
        },
        ctx.user.id
      );

      return { success: true };
    }),

  // Get booking audit history
  getAuditHistory: ownerProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input }) => {
      const { getBookingAuditHistory } = await import('../adminBookingDb');
      return await getBookingAuditHistory(input.bookingId);
    }),

  // Cancel booking
  cancel: ownerProcedure
    .input(z.object({
      bookingId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });

      // Update booking status to cancelled
      const { cancelAdminBooking } = await import('../adminBookingDb');
      await cancelAdminBooking(input.bookingId, ctx.user.id, input.reason);

      return { success: true, bookingNumber: booking.bookingNumber };
    }),

  // Get booking details for editing
  getBookingDetails: ownerProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });

      const customer = await db.getUserById(booking.customerId);
      const profile = customer ? await db.getCustomerProfileByUserId(customer.id) : null;
      const site = await db.getSiteById(booking.siteId);
      const centre = site ? await db.getShoppingCentreById(site.centreId) : null;

      return {
        ...booking,
        customerName: customer?.name,
        customerEmail: customer?.email,
        companyName: profile?.companyName || null,
        siteNumber: site?.siteNumber,
        centreName: centre?.name,
      };
    }),

  // Get booking status history for audit trail
  getStatusHistory: ownerProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input }) => {
      return await db.getBookingStatusHistory(input.bookingId);
    }),

  // Calculate price for a site and date range
  calculatePrice: ownerProcedure
    .input(z.object({
      siteId: z.number(),
      startDate: z.string(), // YYYY-MM-DD format
      endDate: z.string(),   // YYYY-MM-DD format
    }))
    .query(async ({ input }) => {
      const site = await db.getSiteById(input.siteId);
      if (!site) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });

      const { calculateBookingCost } = await import('../bookingCalculation');
      const startDate = new Date(input.startDate + 'T00:00:00Z');
      const endDate = new Date(input.endDate + 'T00:00:00Z');

      const result = await calculateBookingCost(site, startDate, endDate);

      // Get GST rate from config
      const gstValue = await getConfigValue('gst_percentage');
      const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
      const gstAmount = result.totalAmount * gstRate;
      const totalWithGst = result.totalAmount + gstAmount;

      // Calculate total days
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;

      return {
        baseAmount: result.totalAmount,
        gstAmount,
        gstRate: gstRate * 100,
        totalWithGst,
        totalDays,
        weeks,
        remainingDays,
        weekdayCount: result.weekdayCount,
        weekendCount: result.weekendCount,
        dailyRate: site.pricePerDay,
        weeklyRate: site.pricePerWeek,
        weekendRate: site.weekendPricePerDay,
        seasonalDays: result.seasonalDays,
      };
    }),
});
