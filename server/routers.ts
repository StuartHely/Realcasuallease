import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getSystemConfig as getSystemConfigDb, updateSystemConfig as updateSystemConfigDb, getConfigValue, setConfigValue } from "./systemConfigDb";
import { trackImageView, trackImageClick, getTopPerformingImages, getImageAnalyticsBySite } from "./imageAnalyticsDb";
import { getSeasonalRatesBySiteId, createSeasonalRate, updateSeasonalRate, deleteSeasonalRate } from "./seasonalRatesDb";
import { getAllUsageCategories, getApprovedCategoriesForSite, setApprovedCategoriesForSite, getSitesWithCategoriesForCentre } from "./usageCategoriesDb";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail, sendNewBookingNotificationToOwner } from "./_core/bookingNotifications";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role === 'customer') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

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
    
    getByState: publicProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        return await db.getShoppingCentresByState(input.state);
      }),
    
    getNearby: publicProcedure
      .input(z.object({ 
        centreId: z.number(),
        radiusKm: z.number().optional().default(10),
      }))
      .query(async ({ input }) => {
        return await db.getNearbyCentres(input.centreId, input.radiusKm);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        suburb: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        description: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
        operatingHours: z.string().optional(),
        policies: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const centre = await db.getShoppingCentreById(input.id);
        if (!centre) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        }
        
        // Update centre
        await db.updateShoppingCentre(input.id, input);
        
        return { success: true, message: "Centre updated successfully" };
      }),
    
    updateWeeklyReportSettings: protectedProcedure
      .input(z.object({
        id: z.number(),
        weeklyReportEmail1: z.string().email().nullable().optional(),
        weeklyReportEmail2: z.string().email().nullable().optional(),
        weeklyReportEmail3: z.string().email().nullable().optional(),
        weeklyReportEmail4: z.string().email().nullable().optional(),
        weeklyReportEmail5: z.string().email().nullable().optional(),
        weeklyReportEmail6: z.string().email().nullable().optional(),
        weeklyReportEmail7: z.string().email().nullable().optional(),
        weeklyReportEmail8: z.string().email().nullable().optional(),
        weeklyReportEmail9: z.string().email().nullable().optional(),
        weeklyReportEmail10: z.string().email().nullable().optional(),
        weeklyReportTimezone: z.string().optional(),
        weeklyReportNextOverrideDay: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const centre = await db.getShoppingCentreById(input.id);
        if (!centre) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        }
        
        await db.updateShoppingCentre(input.id, input);
        return { success: true, message: "Weekly report settings updated successfully" };
      }),
    
    sendTestWeeklyReport: protectedProcedure
      .input(z.object({ centreId: z.number() }))
      .mutation(async ({ input }) => {
        const { triggerWeeklyReport } = await import("./reportScheduler");
        const result = await triggerWeeklyReport(input.centreId);
        
        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.message });
        }
        
        return { success: true, message: "Test report sent successfully" };
      }),
  }),

  // Sites
  sites: router({
    getByCentreId: publicProcedure
      .input(z.object({ centreId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSitesByCentreId(input.centreId);
      }),
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

    getApprovedCategories: publicProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        const { getApprovedCategoriesForSite } = await import("./usageCategoriesDb");
        return await getApprovedCategoriesForSite(input.siteId);
      }),

    setApprovedCategories: protectedProcedure
      .input(z.object({
        siteId: z.number(),
        categoryIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only owners and mega admins can manage site categories
        const allowedRoles = ['owner_super_admin', 'owner_state_admin', 'owner_regional_admin', 'owner_centre_manager', 'mega_admin', 'mega_state_admin'];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners and administrators can manage site categories' });
        }

        const { setApprovedCategoriesForSite } = await import("./usageCategoriesDb");
        await setApprovedCategoriesForSite(input.siteId, input.categoryIds);
        return { success: true };
      }),
  }),

  // Bookings
  bookings: router({
    create: protectedProcedure
      .input(z.object({
        siteId: z.number(),
        usageTypeId: z.number().optional(), // legacy field
        customUsage: z.string().optional(), // legacy field
        usageCategoryId: z.number().optional(),
        additionalCategoryText: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
        tablesRequested: z.number().optional().default(0),
        chairsRequested: z.number().optional().default(0),
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

        // Calculate booking duration and price with weekend rate support
        const { totalAmount, weekdayCount, weekendCount } = await import("./bookingCalculation").then(m => 
          m.calculateBookingCost(site, input.startDate, input.endDate)
        );

        // Get GST rate
        const gstValue = await getConfigValue("gst_percentage");
        const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
        const gstAmount = totalAmount * gstRate;

        // Get centre and owner info for commission
        const centre = await db.getShoppingCentreById(site.centreId);
        if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        
        const owner = await db.getOwnerById(centre.ownerId);
        if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Owner not found" });

        const platformFee = totalAmount * (Number(owner.commissionPercentage) / 100);
        const ownerAmount = totalAmount - platformFee;

        // Generate booking number with centre code: {CentreCode}-{YYYYMMDD}-{SequenceNumber}
        const dateStr = new Date(input.startDate).toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
        const centreCode = centre.centreCode || `CENTRE${centre.id}`; // Fallback if no code
        const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 001-999
        const bookingNumber = `${centreCode}-${dateStr}-${randomSeq}`;

        // Check equipment availability if requested
        let equipmentWarning: string | undefined;
        if ((input.tablesRequested || 0) > 0 || (input.chairsRequested || 0) > 0) {
          const { checkEquipmentAvailability } = await import("./equipmentAvailability");
          const equipmentCheck = await checkEquipmentAvailability(
            site.centreId,
            input.startDate,
            input.endDate,
            input.tablesRequested || 0,
            input.chairsRequested || 0
          );
          
          if (!equipmentCheck.available) {
            equipmentWarning = equipmentCheck.message;
          }
        }

        // Determine if approval is needed based on usage categories
        let requiresApproval = false;
        
        if (input.usageCategoryId) {
          // Check if additional text was provided (triggers manual approval)
          if (input.additionalCategoryText && input.additionalCategoryText.trim().length > 0) {
            requiresApproval = true;
          } else {
            // Check if category is approved for this site
            const { isCategoryApprovedForSite, getApprovedCategoriesForSite } = await import("./usageCategoriesDb");
            const approvedCategories = await getApprovedCategoriesForSite(input.siteId);
            
            // If no approvals exist (empty), treat as all approved (default behavior - skip duplicate check)
            if (approvedCategories.length === 0) {
              // Default all approved - no additional checks needed
              requiresApproval = false;
            } else {
              // Approvals exist - check if this specific category is approved
              const isApproved = await isCategoryApprovedForSite(input.siteId, input.usageCategoryId);
              
              if (!isApproved) {
                requiresApproval = true;
              } else {
                // Category is explicitly approved - check for duplicates
                // Check for duplicate bookings: same customer + category + centre (any site)
              const { getDb } = await import("./db");
              const { bookings, sites: sitesTable } = await import("../drizzle/schema");
              const { eq, and } = await import("drizzle-orm");
              const dbInstance = await getDb();
              if (dbInstance) {
                // Get the centre ID for the current site
                const currentSite = await dbInstance.select().from(sitesTable)
                  .where(eq(sitesTable.id, input.siteId))
                  .limit(1);
                
                if (currentSite.length > 0) {
                  const centreId = currentSite[0].centreId;
                  
                  // Find all bookings by this customer with same category at same centre
                  const duplicates = await dbInstance.select({
                    bookingId: bookings.id,
                    siteId: bookings.siteId,
                    centreId: sitesTable.centreId,
                  })
                    .from(bookings)
                    .innerJoin(sitesTable, eq(bookings.siteId, sitesTable.id))
                    .where(and(
                      eq(bookings.customerId, ctx.user.id),
                      eq(bookings.usageCategoryId, input.usageCategoryId),
                      eq(sitesTable.centreId, centreId)
                    ));
                  
                  if (duplicates.length > 0) {
                    requiresApproval = true;
                  }
                }
              }
              }
            }
          }
        } else if (input.customUsage) {
          // Legacy: custom usage always requires approval
          requiresApproval = true;
        } else if (input.usageTypeId) {
          // Legacy: check old usage types
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
          usageCategoryId: input.usageCategoryId,
          additionalCategoryText: input.additionalCategoryText,
          startDate: input.startDate,
          endDate: input.endDate,
          totalAmount: totalAmount.toFixed(2),
          gstAmount: gstAmount.toFixed(2),
          ownerAmount: ownerAmount.toFixed(2),
          platformFee: platformFee.toFixed(2),
          status: requiresApproval ? "pending" : (site.instantBooking ? "confirmed" : "pending"),
          requiresApproval,
          tablesRequested: input.tablesRequested || 0,
          chairsRequested: input.chairsRequested || 0,
        });

        return {
          bookingId: Number(result[0].insertId),
          bookingNumber,
          totalAmount,
          requiresApproval,
          equipmentWarning,
          costBreakdown: {
            weekdayCount,
            weekendCount,
            weekdayRate: Number(site.pricePerDay),
            weekendRate: site.weekendPricePerDay ? Number(site.weekendPricePerDay) : Number(site.pricePerDay),
            subtotal: totalAmount,
            gstAmount,
            total: totalAmount + gstAmount,
          },
        };
      }),

    calculatePreview: publicProcedure
      .input(z.object({
        siteId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        // Get site details for pricing
        const site = await db.getSiteById(input.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });

        // Calculate booking cost with seasonal rates
        const { totalAmount, weekdayCount, weekendCount, seasonalDays } = await import("./bookingCalculation").then(m => 
          m.calculateBookingCost(site, input.startDate, input.endDate)
        );

        // Get GST rate
        const gstValue = await getConfigValue("gst_percentage");
        const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
        const gstAmount = totalAmount * gstRate;

        return {
          weekdayCount,
          weekendCount,
          weekdayRate: Number(site.pricePerDay),
          weekendRate: site.weekendPricePerDay ? Number(site.weekendPricePerDay) : Number(site.pricePerDay),
          subtotal: totalAmount,
          gstAmount,
          total: totalAmount + gstAmount,
          seasonalDays: seasonalDays || [],
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

    list: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getBookingsByStatus(input.status);
      }),

    approve: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        
        if (booking.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending bookings can be approved" });
        }

        await db.approveBooking(input.bookingId, ctx.user.id);
        
        // Send confirmation email to customer
        const site = await db.getSiteById(booking.siteId);
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        const customer = await db.getUserById(booking.customerId);
        
        if (customer && site && centre) {
          await sendBookingConfirmationEmail({
            bookingNumber: booking.bookingNumber,
            customerName: customer.name || "Customer",
            customerEmail: customer.email || "",
            centreName: centre.name,
            siteNumber: site.siteNumber,
            startDate: booking.startDate,
            endDate: booking.endDate,
            totalAmount: booking.totalAmount,
          });
        }
        
        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({ 
        bookingId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        
        if (booking.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending bookings can be rejected" });
        }

        await db.rejectBooking(input.bookingId, input.reason);
        
        // Send rejection email to customer with reason
        const site = await db.getSiteById(booking.siteId);
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        const customer = await db.getUserById(booking.customerId);
        
        if (customer && site && centre) {
          await sendBookingRejectionEmail(
            {
              bookingNumber: booking.bookingNumber,
              customerName: customer.name || "Customer",
              customerEmail: customer.email || "",
              centreName: centre.name,
              siteNumber: site.siteNumber,
              startDate: booking.startDate,
              endDate: booking.endDate,
              totalAmount: booking.totalAmount,
            },
            input.reason || "No reason provided"
          );
        }
        
        return { success: true };
      }),

    getPendingApprovals: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "confirmed", "rejected", "all"]).default("pending"),
      }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { bookings, sites, shoppingCentres, users, usageCategories } = await import("../drizzle/schema");
        const { eq, and, inArray } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Build where clause based on status filter
        const whereClause = input.status === "all" 
          ? undefined 
          : eq(bookings.status, input.status);

        // Fetch bookings with joined data
        const bookingsList = await db
          .select({
            id: bookings.id,
            bookingNumber: bookings.bookingNumber,
            status: bookings.status,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
            totalAmount: bookings.totalAmount,
            ownerAmount: bookings.ownerAmount,
            requiresApproval: bookings.requiresApproval,
            additionalCategoryText: bookings.additionalCategoryText,
            rejectionReason: bookings.rejectionReason,
            createdAt: bookings.createdAt,
            // Customer info
            customerId: users.id,
            customerName: users.name,
            customerEmail: users.email,
            // Site info
            siteId: sites.id,
            siteNumber: sites.siteNumber,
            // Centre info
            centreId: shoppingCentres.id,
            centreName: shoppingCentres.name,
            // Category info
            categoryId: usageCategories.id,
            categoryName: usageCategories.name,
          })
          .from(bookings)
          .innerJoin(users, eq(bookings.customerId, users.id))
          .innerJoin(sites, eq(bookings.siteId, sites.id))
          .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
          .leftJoin(usageCategories, eq(bookings.usageCategoryId, usageCategories.id))
          .where(whereClause)
          .orderBy(bookings.createdAt);

        return bookingsList;
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
    // Smart search with site-level support
    smart: publicProcedure
      .input(z.object({ query: z.string(), date: z.date() }))
      .query(async ({ input }) => {
        // Parse query to extract requirements
        const { parseSearchQuery, siteMatchesRequirements } = await import("../shared/queryParser");
        const parsedQuery = parseSearchQuery(input.query);
        console.log('[search] input.query:', input.query, 'parsedQuery:', parsedQuery);
        
        // Try site-level search first using the extracted centre name and category
        const searchQuery = parsedQuery.centreName || input.query;
        console.log('[search] searchQuery:', searchQuery, 'productCategory:', parsedQuery.productCategory);
        const siteResults = await db.searchSitesWithCategory(searchQuery, parsedQuery.productCategory);
        console.log('[search] siteResults count:', siteResults.length);
        
        // If we found specific sites, use those
        if (siteResults.length > 0 && siteResults.length <= 10) {
          const centreIds = Array.from(new Set(siteResults.map(r => r.site.centreId)));
          const centres = await Promise.all(
            centreIds.map(async (centreId) => {
              const centre = siteResults.find(r => r.site.centreId === centreId)?.centre;
              if (!centre) return null;
              return centre;
            })
          );
          
          // Use these centres for the search
          const validCentres = centres.filter((c): c is NonNullable<typeof c> => c !== null);
          if (validCentres.length > 0) {
            input.query = validCentres[0]!.name; // Use first centre name
          }
        }
        
        // Continue with regular search logic using the parsed centre name
        const centres = await db.searchShoppingCentres(searchQuery);
        
        if (centres.length === 0) {
          return { centres: [], sites: [], availability: [], matchedSiteIds: [] };
        }

        const startOfWeek = new Date(input.date);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        const startOfNextWeek = new Date(endOfWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 1);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);

        const allSites: any[] = [];
        const availability: any[] = [];
        const matchedSiteIds: number[] = siteResults.map(r => r.site.id);
        
        // Track if any sites match the size requirement
        let hasMatchingSites = false;
        const hasRequirements = parsedQuery.minSizeM2 !== undefined || parsedQuery.minTables !== undefined || parsedQuery.productCategory !== undefined;
        
        // OPTIMIZED: Batch fetch all data in minimal queries
        const { getSearchDataOptimized } = await import("./dbOptimized");
        const centreIds = centres.map(c => c.id);
        
        const {
          sitesByCentre,
          week1BookingsBySite,
          week2BookingsBySite,
          categoriesBySite,
        } = await getSearchDataOptimized(
          centreIds,
          startOfWeek,
          endOfWeek,
          startOfNextWeek,
          endOfNextWeek
        );
        
        // First pass: check if any sites match the requirements
        for (const centre of centres) {
          const sites = sitesByCentre.get(centre.id) || [];
          
          // Check which sites match the requirements
          const sitesWithMatch = sites.map((site: any) => ({
            site,
            matchesRequirements: siteMatchesRequirements(site, parsedQuery)
          }));
          
          // Check if any sites match
          if (sitesWithMatch.some((s: any) => s.matchesRequirements)) {
            hasMatchingSites = true;
            break; // Found at least one match, no need to continue
          }
        }
        
        // Second pass: collect sites based on whether matches were found
        const siteCategories: Record<number, any[]> = {};
        
        for (const centre of centres) {
          const sites = sitesByCentre.get(centre.id) || [];
          
          // Check which sites match the requirements
          const sitesWithMatch = sites.map((site: any) => ({
            site,
            matchesRequirements: siteMatchesRequirements(site, parsedQuery)
          }));
          
          // If category filtering is active, only include sites that passed category check
          let sitesToInclude = sitesWithMatch;
          if (parsedQuery.productCategory) {
            sitesToInclude = sitesWithMatch.filter((s: any) => matchedSiteIds.includes(s.site.id));
            hasMatchingSites = sitesToInclude.length > 0;
          } else if (hasRequirements && hasMatchingSites) {
            // If size/table requirements specified and matches found, only include matching sites
            sitesToInclude = sitesWithMatch.filter((s: any) => s.matchesRequirements);
          }
          
          allSites.push(...sitesToInclude.map(({ site }: any) => ({ ...site, centreName: centre.name })));
          
          for (const { site } of sitesToInclude as any[]) {
            // Use pre-fetched data instead of individual queries
            const week1Bookings = week1BookingsBySite.get(site.id) || [];
            const week2Bookings = week2BookingsBySite.get(site.id) || [];
            const approvedCategories = categoriesBySite.get(site.id) || [];
            
            siteCategories[site.id] = approvedCategories;
            
            availability.push({
              siteId: site.id,
              siteNumber: site.siteNumber,
              centreName: centre.name,
              week1Available: week1Bookings.length === 0,
              week2Available: week2Bookings.length === 0,
              week1Bookings,
              week2Bookings,
            });
          }
        }
        
        // Return flag indicating if size requirement was met
        const sizeNotAvailable = hasRequirements && !hasMatchingSites;
        
        return { centres, sites: allSites, availability, matchedSiteIds, sizeNotAvailable, siteCategories };
      }),
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

  // Admin endpoints
  admin: router({
    getStats: adminProcedure.query(async () => {
      const centres = await db.getShoppingCentres();
      const sites = await db.getAllSites();
      const bookings = await db.getAllBookings();
      const users = await db.getAllUsers();
      
      const activeBookings = bookings.filter(
        (b) => b.status === 'confirmed' || b.status === 'pending'
      );
      
      const totalRevenue = bookings
        .filter((b: any) => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum: number, b: any) => sum + parseFloat(b.totalAmount), 0);
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = bookings
        .filter(
          (b: any) =>
            (b.status === 'confirmed' || b.status === 'completed') &&
            new Date(b.createdAt) >= monthStart
        )
        .reduce((sum: number, b: any) => sum + parseFloat(b.totalAmount), 0);
      
      const recentBookings = bookings
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((b: any) => ({
          id: b.id,
          siteName: `Site ${b.siteId}`,
          startDate: b.startDate,
          endDate: b.endDate,
          totalPrice: parseFloat(b.totalAmount),
          status: b.status,
        }));
      
      return {
        totalCentres: centres.length,
        totalSites: sites.length,
        activeBookings: activeBookings.length,
        totalRevenue,
        monthlyRevenue,
        totalUsers: users.length,
        recentBookings,
      };
    }),

    // Shopping Centre Management
    createCentre: adminProcedure
      .input(z.object({
        name: z.string(),
        address: z.string().optional(),
        suburb: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createShoppingCentre({
          ...input,
          ownerId: 1, // Default owner, should be dynamic based on user
        });
      }),

    updateCentre: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        address: z.string().optional(),
        suburb: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateShoppingCentre(input.id, input);
      }),

    deleteCentre: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteShoppingCentre(input.id);
      }),

    // Site Management
    createSite: adminProcedure
      .input(z.object({
        centreId: z.number(),
        siteNumber: z.string(),
        description: z.string().optional(),
        size: z.string().optional(),
        maxTables: z.number().optional(),
        powerAvailable: z.string().optional(),
        restrictions: z.string().optional(),
        dailyRate: z.string(),
        weeklyRate: z.string(),
        instantBooking: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createSite(input);
      }),

    updateSite: adminProcedure
      .input(z.object({
        id: z.number(),
        siteNumber: z.string().optional(),
        description: z.string().optional(),
        size: z.string().optional(),
        maxTables: z.number().optional(),
        powerAvailable: z.string().optional(),
        restrictions: z.string().optional(),
        dailyRate: z.string().optional(),
        weeklyRate: z.string().optional(),
        weekendRate: z.string().optional(),
        instantBooking: z.boolean().optional(),
        imageUrl1: z.string().optional(),
        imageUrl2: z.string().optional(),
        imageUrl3: z.string().optional(),
        imageUrl4: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, dailyRate, weeklyRate, weekendRate, ...rest } = input;
        const data: any = { ...rest };
        
        // Map frontend field names to database column names
        if (dailyRate !== undefined) data.pricePerDay = dailyRate;
        if (weeklyRate !== undefined) data.pricePerWeek = weeklyRate;
        if (weekendRate !== undefined) data.weekendPricePerDay = weekendRate;
        
        return await db.updateSite(id, data);
      }),

    getSystemConfig: protectedProcedure
      .query(async () => {
        return await getSystemConfigDb();
      }),

    updateSystemConfig: adminProcedure
      .input(z.object({
        imageQuality: z.number().min(50).max(100),
        imageMaxWidth: z.number().min(800).max(2400),
        imageMaxHeight: z.number().min(600).max(1600),
      }))
      .mutation(async ({ input }) => {
        await updateSystemConfigDb(input);
        return { success: true };
      }),

    // Image Analytics
    trackImageView: publicProcedure
      .input(z.object({
        siteId: z.number(),
        imageSlot: z.number().min(1).max(4),
      }))
      .mutation(async ({ input }) => {
        await trackImageView(input.siteId, input.imageSlot);
        return { success: true };
      }),

    trackImageClick: publicProcedure
      .input(z.object({
        siteId: z.number(),
        imageSlot: z.number().min(1).max(4),
      }))
      .mutation(async ({ input }) => {
        await trackImageClick(input.siteId, input.imageSlot);
        return { success: true };
      }),

    getTopPerformingImages: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(10),
      }))
      .query(async ({ input }) => {
        return await getTopPerformingImages(input.limit);
      }),

    getImageAnalyticsBySite: protectedProcedure
      .input(z.object({
        siteId: z.number(),
      }))
      .query(async ({ input }) => {
        return await getImageAnalyticsBySite(input.siteId);
      }),

    uploadSiteImage: adminProcedure
      .input(z.object({
        siteId: z.number(),
        imageSlot: z.number().min(1).max(4),
        base64Image: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { processSiteImage } = await import('./imageProcessing');
        const { url } = await processSiteImage(
          input.base64Image,
          input.siteId,
          input.imageSlot
        );
        
        // Update the site with the new image URL
        await db.updateSite(input.siteId, {
          [`imageUrl${input.imageSlot}`]: url,
        } as any);
        
        return { url };
      }),

    deleteSite: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteSite(input.id);
      }),

    // Map Management
    uploadCentreMap: adminProcedure
      .input(z.object({
        centreId: z.number(),
        imageData: z.string(), // base64 encoded image
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.uploadCentreMap(input.centreId, input.imageData, input.fileName);
      }),

    saveSiteMarkers: adminProcedure
      .input(z.object({
        centreId: z.number(),
        markers: z.array(z.object({
          siteId: z.number(),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        })),
      }))
      .mutation(async ({ input }) => {
        return await db.saveSiteMarkers(input.markers);
      }),

    resetSiteMarker: adminProcedure
      .input(z.object({
        siteId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.resetSiteMarker(input.siteId);
      }),

    // Floor Level Management
    getFloorLevels: adminProcedure
      .input(z.object({ centreId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFloorLevelsByCentre(input.centreId);
      }),

    createFloorLevel: adminProcedure
      .input(z.object({
        centreId: z.number(),
        levelName: z.string(),
        levelNumber: z.number(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.createFloorLevel(input);
      }),

    deleteFloorLevel: adminProcedure
      .input(z.object({ floorLevelId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteFloorLevel(input.floorLevelId);
      }),

    uploadFloorLevelMap: adminProcedure
      .input(z.object({
        floorLevelId: z.number(),
        imageData: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.uploadFloorLevelMap(input.floorLevelId, input.imageData, input.fileName);
      }),

    getSitesByFloorLevel: adminProcedure
      .input(z.object({ floorLevelId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSitesByFloorLevel(input.floorLevelId);
      }),

    updateSiteFloorAssignment: adminProcedure
      .input(z.object({
        assignments: z.array(z.object({
          siteId: z.number(),
          floorLevelId: z.number().nullable()
        }))
      }))
      .mutation(async ({ input }) => {
        return await db.updateSiteFloorAssignments(input.assignments);
      }),

    // Seasonal Pricing Management
    getSeasonalRatesBySite: adminProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        return await getSeasonalRatesBySiteId(input.siteId);
      }),

    createSeasonalRate: adminProcedure
      .input(z.object({
        siteId: z.number(),
        name: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        weekdayRate: z.number().optional(),
        weekendRate: z.number().optional(),
        weeklyRate: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createSeasonalRate(input);
      }),

    updateSeasonalRate: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        weekdayRate: z.number().optional(),
        weekendRate: z.number().optional(),
        weeklyRate: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateSeasonalRate(id, data);
      }),

    deleteSeasonalRate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteSeasonalRate(input.id);
      }),

    getOwners: adminProcedure
      .query(async () => {
        return await db.getOwners();
      }),

    getAllCentres: adminProcedure
      .query(async () => {
        const centres = await db.getShoppingCentres();
        // Get sites for each centre to calculate max tables needed
        const centresWithSites = await Promise.all(
          centres.map(async (centre) => {
            const sites = await db.getSitesByCentreId(centre.id);
            return { ...centre, sites };
          })
        );
        return centresWithSites;
      }),

    updateCentreEquipment: adminProcedure
      .input(z.object({
        centreId: z.number(),
        totalTablesAvailable: z.number().min(0),
        totalChairsAvailable: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        return await db.updateShoppingCentre(input.centreId, {
          totalTablesAvailable: input.totalTablesAvailable,
          totalChairsAvailable: input.totalChairsAvailable,
        });
      }),

    // Booking Approval Management
    getPendingApprovals: adminProcedure
      .query(async () => {
        const pendingBookings = await db.getBookingsByStatus('pending');
        
        // Get additional details for each booking
        const bookingsWithDetails = await Promise.all(
          pendingBookings
            .filter(b => b.requiresApproval)
            .map(async (booking) => {
              const site = await db.getSiteById(booking.siteId);
              const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
              const customer = await db.getUserById(booking.customerId);
              const usageType = booking.usageTypeId ? await db.getUsageTypeById(booking.usageTypeId) : null;
              
              return {
                ...booking,
                centreName: centre?.name || 'Unknown Centre',
                siteNumber: site?.siteNumber || 'Unknown',
                siteDescription: site?.description,
                customerName: customer?.name || 'Unknown Customer',
                customerEmail: customer?.email,
                usageTypeName: usageType?.name,
              };
            })
        );
        
        return bookingsWithDetails;
      }),

    approveBooking: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.approveBooking(input.bookingId, ctx.user.id);
        
        // Get booking details for notification
        const booking = await db.getBookingById(input.bookingId);
        const site = booking ? await db.getSiteById(booking.siteId) : null;
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        
        // Notify owner
        await notifyOwner({
          title: 'Booking Approved',
          content: `Booking #${booking?.bookingNumber} at ${centre?.name} - Site ${site?.siteNumber} has been approved.`,
        });
        
        // TODO: Send confirmation email to customer
        
        return { success: true };
      }),

    rejectBooking: adminProcedure
      .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.rejectBooking(input.bookingId, input.reason);
        
        // Get booking details for notification
        const booking = await db.getBookingById(input.bookingId);
        const site = booking ? await db.getSiteById(booking.siteId) : null;
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        
        // Notify owner
        await notifyOwner({
          title: 'Booking Rejected',
          content: `Booking #${booking?.bookingNumber} at ${centre?.name} - Site ${site?.siteNumber} has been rejected.`,
        });
        
        // TODO: Send rejection email to customer with reason
        
        return { success: true };
      }),

    bulkCreateSeasonalRates: adminProcedure
      .input(z.object({
        centreIds: z.array(z.number()),
        name: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        percentageIncrease: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { centreIds, name, startDate, endDate, percentageIncrease } = input;
        
        // Get all sites for the selected centres
        const allSites = [];
        for (const centreId of centreIds) {
          const sites = await db.getSitesByCentreId(centreId);
          allSites.push(...sites);
        }

        // Create seasonal rates for each site
        let created = 0;
        for (const site of allSites) {
          // Calculate increased rates
          const multiplier = 1 + (percentageIncrease / 100);
          const weekdayRate = site.pricePerDay ? Math.round(parseFloat(site.pricePerDay) * multiplier * 100) / 100 : undefined;
          const weekendRate = site.weekendPricePerDay ? Math.round(parseFloat(site.weekendPricePerDay) * multiplier * 100) / 100 : undefined;
          const weeklyRate = site.pricePerWeek ? Math.round(parseFloat(site.pricePerWeek) * multiplier * 100) / 100 : undefined;

          await createSeasonalRate({
            siteId: site.id,
            name,
            startDate,
            endDate,
            weekdayRate,
            weekendRate,
            weeklyRate,
          });
          created++;
        }

        return { created, totalSites: allSites.length };
      }),
  }),

  // Usage Categories
  usageCategories: router({
    list: publicProcedure.query(async () => {
      return await getAllUsageCategories();
    }),
    
    getApprovedForSite: publicProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        return await getApprovedCategoriesForSite(input.siteId);
      }),
    
    getSitesWithCategories: adminProcedure
      .input(z.object({ centreId: z.number() }))
      .query(async ({ input }) => {
        return await getSitesWithCategoriesForCentre(input.centreId);
      }),
    
    setApprovedCategories: adminProcedure
      .input(z.object({
        siteId: z.number(),
        categoryIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await setApprovedCategoriesForSite(input.siteId, input.categoryIds);
        return { success: true };
      }),
    
    createCategory: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        isFree: z.boolean(),
        displayOrder: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const { createUsageCategory } = await import("./usageCategoriesDb");
        const categoryId = await createUsageCategory(input.name, input.isFree, input.displayOrder);
        return { success: true, categoryId };
      }),
    
    applyToAllSites: adminProcedure
      .input(z.object({
        centreId: z.number(),
        categoryIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const { applyApprovalsToAllSitesInCentre } = await import("./usageCategoriesDb");
        const sitesUpdated = await applyApprovalsToAllSitesInCentre(input.centreId, input.categoryIds);
        return { success: true, sitesUpdated };
      }),
  }),

  // System Configuration
  systemConfig: router({
    getGstPercentage: publicProcedure.query(async () => {
      const value = await getConfigValue("gst_percentage");
      return { gstPercentage: value ? parseFloat(value) : 10.0 };
    }),

    setGstPercentage: adminProcedure
      .input(z.object({ gstPercentage: z.number().min(0).max(100) }))
      .mutation(async ({ input, ctx }) => {
        // Only mega_admin and owner_super_admin can change GST
        if (ctx.user.role !== "mega_admin" && ctx.user.role !== "owner_super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only SuperAdmin can change GST percentage" });
        }
        await setConfigValue("gst_percentage", input.gstPercentage.toString());
        return { success: true, gstPercentage: input.gstPercentage };
      }),
  }),
});

export type AppRouter = typeof appRouter;
