import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Shopping Centres
  centres: router({
    list: publicProcedure.query(async () => {
      return await db.getShoppingCentres();
    }),
    
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchShoppingCentres(input.query);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const centre = await db.getShoppingCentreById(input.id);
        if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        return centre;
      }),
    
    getSites: publicProcedure
      .input(z.object({ centreId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSitesByCentreId(input.centreId);
      }),
  }),

  // Sites
  sites: router({
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const site = await db.getSiteById(input.id);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        return site;
      }),
    
    checkAvailability: publicProcedure
      .input(z.object({
        siteId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        const bookings = await db.getBookingsBySiteId(input.siteId, input.startDate, input.endDate);
        return {
          available: bookings.length === 0,
          bookings: bookings.map(b => ({
            id: b.id,
            startDate: b.startDate,
            endDate: b.endDate,
            status: b.status,
          })),
        };
      }),
  }),

  // Bookings
  bookings: router({
    create: protectedProcedure
      .input(z.object({
        siteId: z.number(),
        usageTypeId: z.number().optional(),
        customUsage: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check availability
        const existingBookings = await db.getBookingsBySiteId(input.siteId, input.startDate, input.endDate);
        if (existingBookings.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Site is already booked for this period" });
        }

        // Get site details for pricing
        const site = await db.getSiteById(input.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });

        // Calculate booking duration and price
        const days = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        const totalAmount = (weeks * Number(site.pricePerWeek)) + (remainingDays * Number(site.pricePerDay));

        // Get GST rate
        const gstConfig = await db.getSystemConfig("gst_percentage");
        const gstRate = gstConfig ? Number(gstConfig.value) / 100 : 0.1;
        const gstAmount = totalAmount * gstRate;

        // Get centre and owner info for commission
        const centre = await db.getShoppingCentreById(site.centreId);
        if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        
        const owner = await db.getOwnerById(centre.ownerId);
        if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Owner not found" });

        const platformFee = totalAmount * (Number(owner.commissionPercentage) / 100);
        const ownerAmount = totalAmount - platformFee;

        // Generate booking number
        const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // Determine if approval is needed
        let requiresApproval = false;
        if (input.customUsage) {
          requiresApproval = true;
        } else if (input.usageTypeId) {
          const usageType = await db.getUsageTypes();
          const selectedUsage = usageType.find(u => u.id === input.usageTypeId);
          if (selectedUsage?.requiresApproval) {
            requiresApproval = true;
          }
        }

        // Create booking
        const result = await db.createBooking({
          bookingNumber,
          siteId: input.siteId,
          customerId: ctx.user.id,
          usageTypeId: input.usageTypeId,
          customUsage: input.customUsage,
          startDate: input.startDate,
          endDate: input.endDate,
          totalAmount: totalAmount.toFixed(2),
          gstAmount: gstAmount.toFixed(2),
          ownerAmount: ownerAmount.toFixed(2),
          platformFee: platformFee.toFixed(2),
          status: requiresApproval ? "pending" : (site.instantBooking ? "confirmed" : "pending"),
          requiresApproval,
        });

        return {
          bookingId: Number(result[0].insertId),
          bookingNumber,
          totalAmount,
          requiresApproval,
        };
      }),

    myBookings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBookingsByCustomerId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        
        // Check if user owns this booking
        if (booking.customerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        return booking;
      }),
  }),

  // Customer Profile
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCustomerProfileByUserId(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        website: z.string().optional(),
        abn: z.string().optional(),
        streetAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        productCategory: z.string().optional(),
        insuranceCompany: z.string().optional(),
        insurancePolicyNo: z.string().optional(),
        insuranceAmount: z.string().optional(),
        insuranceExpiry: z.date().optional(),
        insuranceDocumentUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getCustomerProfileByUserId(ctx.user.id);
        
        if (existing) {
          await db.updateCustomerProfile(ctx.user.id, input);
        } else {
          await db.createCustomerProfile({
            userId: ctx.user.id,
            ...input,
          });
        }
        
        return { success: true };
      }),
  }),

  // Usage Types
  usageTypes: router({
    list: publicProcedure.query(async () => {
      return await db.getUsageTypes();
    }),
  }),

  // Search with date
  search: router({
    byNameAndDate: publicProcedure
      .input(z.object({
        centreName: z.string(),
        date: z.date(),
      }))
      .query(async ({ input }) => {
        // Search for centres matching the name
        const centres = await db.searchShoppingCentres(input.centreName);
        
        if (centres.length === 0) {
          return { centres: [], sites: [], availability: [] };
        }

        // Get the requested week start and end
        const startOfWeek = new Date(input.date);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        // Get the following week
        const startOfNextWeek = new Date(endOfWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 1);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);

        // Get all sites for these centres
        const allSites = [];
        const availability = [];
        
        for (const centre of centres) {
          const sites = await db.getSitesByCentreId(centre.id);
          allSites.push(...sites.map(s => ({ ...s, centreName: centre.name })));
          
          // Check availability for each site
          for (const site of sites) {
            const week1Bookings = await db.getBookingsBySiteId(site.id, startOfWeek, endOfWeek);
            const week2Bookings = await db.getBookingsBySiteId(site.id, startOfNextWeek, endOfNextWeek);
            
            availability.push({
              siteId: site.id,
              week1Available: week1Bookings.length === 0,
              week2Available: week2Bookings.length === 0,
              week1Bookings: week1Bookings.map(b => ({ startDate: b.startDate, endDate: b.endDate })),
              week2Bookings: week2Bookings.map(b => ({ startDate: b.startDate, endDate: b.endDate })),
            });
          }
        }

        return {
          centres,
          sites: allSites,
          availability,
          requestedWeek: { start: startOfWeek, end: endOfWeek },
          followingWeek: { start: startOfNextWeek, end: endOfNextWeek },
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
