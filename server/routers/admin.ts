import { publicProcedure, protectedProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { getSystemConfig as getSystemConfigDb, updateSystemConfig as updateSystemConfigDb } from "../systemConfigDb";
import { trackImageView, trackImageClick, getTopPerformingImages, getImageAnalyticsBySite } from "../imageAnalyticsDb";
import { getSeasonalRatesBySiteId, createSeasonalRate, updateSeasonalRate, deleteSeasonalRate } from "../seasonalRatesDb";
import { notifyOwner } from "../_core/notification";

export const adminRouter = router({
    getStats: ownerProcedure.query(async () => {
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
        ownerId: z.number(),
        name: z.string().trim(),
        address: z.string().trim().optional(),
        suburb: z.string().trim().optional(),
        state: z.string().trim().toUpperCase().optional(),
        postcode: z.string().trim().optional(),
        description: z.string().optional(),
        paymentMode: z.enum(["stripe", "stripe_with_exceptions", "invoice_only"]).default("stripe_with_exceptions"),
        portfolioId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        // Force invoice_only if the owner is an agency
        const owner = await db.getOwnerById(input.ownerId);
        const paymentMode = owner?.isAgency ? "invoice_only" : input.paymentMode;

        return await db.createShoppingCentre({
          ...input,
          paymentMode,
        });
      }),

    updateCentre: ownerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().trim(),
        address: z.string().trim().optional(),
        suburb: z.string().trim().optional(),
        state: z.string().trim().toUpperCase().optional(),
        postcode: z.string().trim().optional(),
        description: z.string().optional(),
        includeInMainSite: z.boolean().optional(),
        paymentMode: z.enum(["stripe", "stripe_with_exceptions", "invoice_only"]).optional(),
        portfolioId: z.number().nullable().optional(),
        bankBsb: z.string().nullable().optional(),
        bankAccountNumber: z.string().nullable().optional(),
        bankAccountName: z.string().nullable().optional(),
        pdfUrl1: z.string().optional(),
        pdfName1: z.string().optional(),
        pdfUrl2: z.string().optional(),
        pdfName2: z.string().optional(),
        pdfUrl3: z.string().optional(),
        pdfName3: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateShoppingCentre(id, updates);
      }),

    deleteCentre: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteShoppingCentre(input.id);
      }),

    // Site Management
    createSite: ownerProcedure
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
        weekendRate: z.string().optional(),
        outgoingsPerDay: z.string().optional(),
        instantBooking: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { dailyRate, weeklyRate, weekendRate, outgoingsPerDay, ...rest } = input;
        return await db.createSite({
          ...rest,
          pricePerDay: dailyRate,
          pricePerWeek: weeklyRate,
          weekendPricePerDay: weekendRate || null,
          outgoingsPerDay: outgoingsPerDay || null,
        });
      }),

    updateSite: ownerProcedure
      .input(z.object({
        id: z.number(),
        siteNumber: z.string().optional(),
        description: z.string().optional(),
        size: z.string().optional(),
        maxTables: z.number().nullish(),
        powerAvailable: z.string().optional(),
        restrictions: z.string().optional(),
        dailyRate: z.string().optional(),
        weeklyRate: z.string().optional(),
        weekendRate: z.string().nullish(),
        outgoingsPerDay: z.string().nullish(),
        instantBooking: z.boolean().optional(),
        imageUrl1: z.string().nullish(),
        imageUrl2: z.string().nullish(),
        imageUrl3: z.string().nullish(),
        imageUrl4: z.string().nullish(),
      }))
      .mutation(async ({ input }) => {
        const { id, dailyRate, weeklyRate, weekendRate, outgoingsPerDay, ...rest } = input;
        const data: any = { ...rest };
        
        if (dailyRate !== undefined) data.pricePerDay = dailyRate || null;
        if (weeklyRate !== undefined) data.pricePerWeek = weeklyRate || null;
        if (weekendRate !== undefined) data.weekendPricePerDay = weekendRate || null;
        if (outgoingsPerDay !== undefined) data.outgoingsPerDay = outgoingsPerDay || null;
        
        console.log('[updateSite] Updating site:', { id, data });
        try {
          const result = await db.updateSite(id, data);
          console.log('[updateSite] Success:', result);
          return result;
        } catch (error: any) {
          console.error('[updateSite] Error:', error.message, error.stack);
          throw error;
        }
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

    uploadSiteImage: ownerProcedure
      .input(z.object({
        siteId: z.number(),
        imageSlot: z.number().min(1).max(4),
        base64Image: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { processSiteImage } = await import('../imageProcessing');
        const { url } = await processSiteImage(
          input.base64Image,
          input.siteId,
          input.imageSlot
        );
        
        await db.updateSite(input.siteId, {
          [`imageUrl${input.imageSlot}`]: url,
        } as any);
        
        return { url };
      }),

    uploadSitePanorama: ownerProcedure
      .input(z.object({
        siteId: z.number(),
        base64Image: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { processPanoramaImage } = await import('../imageProcessing');
        const { url } = await processPanoramaImage(
          input.base64Image,
          input.siteId
        );
        
        await db.updateSite(input.siteId, {
          hasPanorama: true,
          panoramaImageUrl: url,
        });
        
        return { success: true, url };
      }),

    deleteSite: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteSite(input.id);
      }),

    removeSitePanorama: ownerProcedure
      .input(z.object({
        siteId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.updateSite(input.siteId, {
          hasPanorama: false,
          panoramaImageUrl: null,
        });
        
        return { success: true };
      }),

    // Map Management
    uploadCentreMap: ownerProcedure
      .input(z.object({
        centreId: z.number(),
        imageData: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.uploadCentreMap(input.centreId, input.imageData, input.fileName);
      }),

    saveSiteMarkers: ownerProcedure
      .input(z.object({
        centreId: z.number(),
        markers: z.array(z.object({
          siteId: z.number(),
          x: z.coerce.number().min(0).max(100),
          y: z.coerce.number().min(0).max(100),
        })),
      }))
      .mutation(async ({ input }) => {
        return await db.saveSiteMarkers(input.markers);
      }),

    resetSiteMarker: ownerProcedure
      .input(z.object({
        siteId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.resetSiteMarker(input.siteId);
      }),

    // Floor Level Management
    getFloorLevels: ownerProcedure
      .input(z.object({ centreId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFloorLevelsByCentre(input.centreId, true);
      }),

    createFloorLevel: ownerProcedure
      .input(z.object({
        centreId: z.number(),
        levelName: z.string(),
        levelNumber: z.string(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.createFloorLevel(input);
      }),

    deleteFloorLevel: ownerProcedure
      .input(z.object({ floorLevelId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteFloorLevel(input.floorLevelId);
      }),

    hideFloorLevel: ownerProcedure
      .input(z.object({ floorLevelId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.hideFloorLevel(input.floorLevelId);
      }),

    unhideFloorLevel: ownerProcedure
      .input(z.object({ floorLevelId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.unhideFloorLevel(input.floorLevelId);
      }),

    uploadFloorLevelMap: ownerProcedure
      .input(z.object({
        floorLevelId: z.number(),
        imageData: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.uploadFloorLevelMap(input.floorLevelId, input.imageData, input.fileName);
      }),

    getSitesByFloorLevel: ownerProcedure
      .input(z.object({ floorLevelId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSitesByFloorLevel(input.floorLevelId);
      }),

    updateSiteFloorAssignment: ownerProcedure
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
    getSeasonalRatesBySite: ownerProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        return await getSeasonalRatesBySiteId(input.siteId);
      }),

    createSeasonalRate: ownerProcedure
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

    updateSeasonalRate: ownerProcedure
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

    deleteSeasonalRate: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteSeasonalRate(input.id);
      }),

    getOwners: ownerProcedure
      .query(async () => {
        return await db.getOwners();
      }),

    getAllCentres: ownerProcedure
      .query(async () => {
        const centres = await db.getShoppingCentres();
        const centresWithSites = await Promise.all(
          centres.map(async (centre) => {
            const sites = await db.getSitesByCentreId(centre.id);
            return { ...centre, sites };
          })
        );
        return centresWithSites;
      }),

    updateCentreEquipment: ownerProcedure
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
    getPendingApprovals: ownerProcedure
      .query(async () => {
        const { scanInsuranceDocument, validateInsurance } = await import('../insuranceScanner');
        const pendingBookings = await db.getBookingsByStatus('pending');
        
        const bookingsWithDetails = await Promise.all(
          pendingBookings
            .filter(b => b.requiresApproval)
            .map(async (booking) => {
              const site = await db.getSiteById(booking.siteId);
              const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
              const customer = await db.getUserById(booking.customerId);
              const usageType = booking.usageTypeId ? await db.getUsageTypeById(booking.usageTypeId) : null;
              
              const customerProfile = await db.getCustomerProfileByUserId(booking.customerId);
              let approvalReason = 'Manual approval required';
              let insuranceExpired = false;
              const reasons: string[] = [];
              
              if (customerProfile?.insuranceExpiry) {
                const insuranceExpiryDate = new Date(customerProfile.insuranceExpiry);
                const bookingEndDate = new Date(booking.endDate);
                
                if (insuranceExpiryDate < bookingEndDate) {
                  reasons.push('Insurance expired before booking end date');
                  insuranceExpired = true;
                }
              }
              
              if (customerProfile?.insuranceAmount) {
                const coverageAmount = parseFloat(customerProfile.insuranceAmount);
                const requiredAmount = 20000000;
                
                if (coverageAmount < requiredAmount) {
                  reasons.push(`Insufficient insurance coverage ($${(coverageAmount / 1000000).toFixed(1)}M, requires $20M)`);
                }
              }
              
              if (booking.additionalCategoryText && booking.additionalCategoryText.trim().length > 0) {
                reasons.push('Custom usage category details provided');
              }
              
              if (booking.usageCategoryId) {
                const { isCategoryApprovedForSite, getApprovedCategoriesForSite } = await import('../usageCategoriesDb');
                const approvedCategories = await getApprovedCategoriesForSite(booking.siteId);
                
                if (approvedCategories.length > 0) {
                  const isApproved = await isCategoryApprovedForSite(booking.siteId, booking.usageCategoryId);
                  
                  if (!isApproved) {
                    const { getAllUsageCategories } = await import('../usageCategoriesDb');
                    const allCategories = await getAllUsageCategories();
                    const category = allCategories.find(c => c.id === booking.usageCategoryId);
                    reasons.push(`Usage category "${category?.name || 'Unknown'}" not approved for this site`);
                  } else {
                    const { getDb } = await import('../db');
                    const { bookings: bookingsTable, sites: sitesTable } = await import('../../drizzle/schema');
                    const { eq, and, ne, or, lte, gte } = await import('drizzle-orm');
                    const dbInstance = await getDb();
                    
                    if (dbInstance && site) {
                      const overlappingBookings = await dbInstance.select()
                        .from(bookingsTable)
                        .innerJoin(sitesTable, eq(bookingsTable.siteId, sitesTable.id))
                        .where(and(
                          ne(bookingsTable.customerId, booking.customerId),
                          eq(bookingsTable.usageCategoryId, booking.usageCategoryId),
                          eq(sitesTable.centreId, site.centreId),
                          ne(bookingsTable.id, booking.id),
                          or(
                            eq(bookingsTable.status, 'pending'),
                            eq(bookingsTable.status, 'confirmed')
                          ),
                          lte(bookingsTable.startDate, booking.endDate),
                          gte(bookingsTable.endDate, booking.startDate)
                        ));
                      
                      if (overlappingBookings.length > 0) {
                        reasons.push('Category conflict: another customer has overlapping booking with same category at this centre');
                      }
                    }
                  }
                }
              }
              
              if (!site?.instantBooking) {
                reasons.push('Site requires manual approval for all bookings');
              }
              
              if (booking.customUsage) {
                reasons.push('Custom usage type specified');
              }
              
              if (reasons.length > 0) {
                approvalReason = reasons.join('; ');
              }
              
              let insuranceScan = null;
              let insuranceValidation = null;
              
              if (customerProfile?.insuranceDocumentUrl) {
                try {
                  const scanResult = await scanInsuranceDocument(customerProfile.insuranceDocumentUrl);
                  insuranceScan = scanResult;
                  insuranceValidation = validateInsurance(scanResult);
                } catch (error) {
                  console.error('[getPendingApprovals] Error scanning insurance:', error);
                  insuranceValidation = {
                    valid: false,
                    errors: ['Error scanning insurance document - manual review required']
                  };
                }
              } else {
                insuranceValidation = {
                  valid: false,
                  errors: ['No insurance document uploaded']
                };
              }
              
              return {
                ...booking,
                centreName: centre?.name || 'Unknown Centre',
                siteNumber: site?.siteNumber || 'Unknown',
                siteDescription: site?.description,
                customerName: customer?.name || 'Unknown Customer',
                customerEmail: customer?.email,
                usageTypeName: usageType?.name,
                approvalReason,
                insuranceExpired,
                insuranceScan,
                insuranceValidation,
                insuranceDocumentUrl: customerProfile?.insuranceDocumentUrl || null,
              };
            })
        );
        
        return bookingsWithDetails;
      }),

    approveBooking: ownerProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.approveBooking(input.bookingId, ctx.user.id, ctx.user.name || undefined);
        
        const booking = await db.getBookingById(input.bookingId);
        const site = booking ? await db.getSiteById(booking.siteId) : null;
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        
        await notifyOwner({
          title: 'Booking Approved',
          content: `Booking #${booking?.bookingNumber} at ${centre?.name} - Site ${site?.siteNumber} has been approved.`,
        });
        
        return { success: true };
      }),

    rejectBooking: ownerProcedure
      .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.rejectBooking(input.bookingId, input.reason || "No reason provided", ctx.user.id, ctx.user.name || undefined);
        
        const booking = await db.getBookingById(input.bookingId);
        const site = booking ? await db.getSiteById(booking.siteId) : null;
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        
        await notifyOwner({
          title: 'Booking Rejected',
          content: `Booking #${booking?.bookingNumber} at ${centre?.name} - Site ${site?.siteNumber} has been rejected.`,
        });
        
        return { success: true };
      }),

    bulkCreateSeasonalRates: ownerProcedure
      .input(z.object({
        centreIds: z.array(z.number()),
        name: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        percentageIncrease: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { centreIds, name, startDate, endDate, percentageIncrease } = input;
        
        const allSites = [];
        for (const centreId of centreIds) {
          const sites = await db.getSitesByCentreId(centreId);
          allSites.push(...sites);
        }

        let created = 0;
        for (const site of allSites) {
          const multiplier = 1 + (percentageIncrease / 100);
          const baseWeekdayRate = site.pricePerDay ? parseFloat(site.pricePerDay) : 0;
          const baseWeekendRate = site.weekendPricePerDay ? parseFloat(site.weekendPricePerDay) : 0;
          
          const weekdayRate = baseWeekdayRate > 0 ? Math.round(baseWeekdayRate * multiplier * 100) / 100 : undefined;
          const weekendRate = baseWeekendRate > 0 
            ? Math.round(baseWeekendRate * multiplier * 100) / 100 
            : (baseWeekdayRate > 0 ? Math.round(baseWeekdayRate * multiplier * 100) / 100 : undefined);
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

    // Invoice Payment Management
    searchInvoiceBookings: ownerProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchInvoiceBookings(input.query);
      }),

    recordPayment: ownerProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.recordPayment(input.bookingId, ctx.user.name || 'Admin');
      }),

    triggerPaymentReminders: ownerProcedure
      .mutation(async () => {
        const { sendPaymentReminders } = await import('../paymentReminders');
        return await sendPaymentReminders();
      }),

    // Invoice Dashboard
    getInvoiceStats: ownerProcedure
      .input(z.object({
        paymentMode: z.enum(['all', 'invoice', 'stripe']).optional(),
      }))
      .query(async ({ input }) => {
        const { getInvoiceStats } = await import('../invoiceDashboardDb');
        return await getInvoiceStats(input.paymentMode);
      }),

    getInvoiceList: ownerProcedure
      .input(z.object({
        filter: z.enum(['all', 'outstanding', 'overdue', 'paid']).default('all'),
        paymentMode: z.enum(['all', 'invoice', 'stripe']).optional(),
      }))
      .query(async ({ input }) => {
        const { getInvoiceList } = await import('../invoiceDashboardDb');
        return await getInvoiceList(input.filter, input.paymentMode);
      }),

    getPaymentHistory: ownerProcedure
      .input(z.object({
        searchTerm: z.string().optional(),
        paymentMode: z.enum(['all', 'invoice', 'stripe']).optional(),
      }))
      .query(async ({ input }) => {
        const { getPaymentHistory } = await import('../invoiceDashboardDb');
        return await getPaymentHistory(input.searchTerm, input.paymentMode);
      }),

    // User Registration
    registerUser: adminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string(),
        password: z.string().min(8),
        role: z.enum([
          'customer',
          'owner_viewer',
          'owner_centre_manager',
          'owner_marketing_manager',
          'owner_regional_admin',
          'owner_state_admin',
          'owner_super_admin',
          'mega_state_admin',
          'mega_admin'
        ]).default('customer'),
        assignedOwnerId: z.number().nullable().optional(),
        canPayByInvoice: z.boolean().default(false),
        companyName: z.string().optional(),
        tradingName: z.string().optional(),
        companyWebsite: z.string().optional(),
        abn: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        productService: z.string().optional(),
        insuranceCompany: z.string().optional(),
        insurancePolicyNo: z.string().optional(),
        insuranceAmount: z.string().optional(),
        insuranceExpiryDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'User with this email already exists' });
        }

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(input.password, 10);

        const { getDb } = await import('../db');
        const { users } = await import('../../drizzle/schema');
        const dbInstance = await getDb();
        
        if (!dbInstance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        }

        const openId = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const [newUser] = await dbInstance.insert(users).values({
          openId,
          username: input.email,
          passwordHash: hashedPassword,
          email: input.email,
          name: input.name,
          role: input.role,
          assignedOwnerId: input.assignedOwnerId ?? null,
          canPayByInvoice: input.canPayByInvoice,
          loginMethod: 'password',
        }).returning({ id: users.id });

        if (input.companyName || input.insuranceCompany) {
          const { customerProfiles } = await import('../../drizzle/schema');
          await dbInstance.insert(customerProfiles).values({
            userId: newUser.id,
            companyName: input.companyName || null,
            tradingName: input.tradingName || null,
            website: input.companyWebsite || null,
            abn: input.abn || null,
            streetAddress: input.address || null,
            city: input.city || null,
            state: input.state || null,
            postcode: input.postcode || null,
            productCategory: input.productService || null,
            insuranceCompany: input.insuranceCompany || null,
            insurancePolicyNo: input.insurancePolicyNo || null,
            insuranceAmount: input.insuranceAmount || null,
            insuranceExpiry: input.insuranceExpiryDate ? new Date(input.insuranceExpiryDate) : null,
          });
        }

        return { success: true, message: 'User registered successfully' };
      }),

    // Update User
    updateUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        role: z.enum([
          'customer',
          'owner_viewer',
          'owner_centre_manager',
          'owner_marketing_manager',
          'owner_regional_admin',
          'owner_state_admin',
          'owner_super_admin',
          'mega_state_admin',
          'mega_admin'
        ]).optional(),
        assignedOwnerId: z.number().nullable().optional(),
        assignedState: z.string().nullable().optional(),
        canPayByInvoice: z.boolean().optional(),
        companyName: z.string().optional(),
        tradingName: z.string().optional(),
        website: z.string().optional(),
        abn: z.string().optional(),
        streetAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        productCategory: z.string().optional(),
        productDetails: z.string().optional(),
        insuranceCompany: z.string().optional(),
        insurancePolicyNo: z.string().optional(),
        insuranceAmount: z.string().optional(),
        insuranceExpiry: z.string().optional(),
        insuranceDocumentUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('../db');
        const { users, customerProfiles } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const dbInstance = await getDb();
        
        if (!dbInstance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        }

        const userUpdates: any = {};
        if (input.email) userUpdates.email = input.email;
        if (input.name) userUpdates.name = input.name;
        if (input.role) userUpdates.role = input.role;
        if (input.assignedOwnerId !== undefined) userUpdates.assignedOwnerId = input.assignedOwnerId;
        if (input.assignedState !== undefined) userUpdates.assignedState = input.assignedState || null;
        if (input.canPayByInvoice !== undefined) userUpdates.canPayByInvoice = input.canPayByInvoice;

        if (Object.keys(userUpdates).length > 0) {
          await dbInstance.update(users).set(userUpdates).where(eq(users.id, input.userId));
        }

        const profileUpdates: any = {};
        if (input.companyName !== undefined) profileUpdates.companyName = input.companyName || null;
        if (input.tradingName !== undefined) profileUpdates.tradingName = input.tradingName || null;
        if (input.website !== undefined) profileUpdates.website = input.website || null;
        if (input.abn !== undefined) profileUpdates.abn = input.abn || null;
        if (input.streetAddress !== undefined) profileUpdates.streetAddress = input.streetAddress || null;
        if (input.city !== undefined) profileUpdates.city = input.city || null;
        if (input.state !== undefined) profileUpdates.state = input.state || null;
        if (input.postcode !== undefined) profileUpdates.postcode = input.postcode || null;
        if (input.productCategory !== undefined) profileUpdates.productCategory = input.productCategory || null;
        if (input.productDetails !== undefined) profileUpdates.productDetails = input.productDetails || null;
        if (input.insuranceCompany !== undefined) profileUpdates.insuranceCompany = input.insuranceCompany || null;
        if (input.insurancePolicyNo !== undefined) profileUpdates.insurancePolicyNo = input.insurancePolicyNo || null;
        if (input.insuranceAmount !== undefined) profileUpdates.insuranceAmount = input.insuranceAmount || null;
        if (input.insuranceExpiry !== undefined) profileUpdates.insuranceExpiry = input.insuranceExpiry ? new Date(input.insuranceExpiry) : null;
        if (input.insuranceDocumentUrl !== undefined) profileUpdates.insuranceDocumentUrl = input.insuranceDocumentUrl || null;

        if (Object.keys(profileUpdates).length > 0) {
          const existingProfile = await dbInstance.select().from(customerProfiles).where(eq(customerProfiles.userId, input.userId)).limit(1);
          
          if (existingProfile.length > 0) {
            await dbInstance.update(customerProfiles).set(profileUpdates).where(eq(customerProfiles.userId, input.userId));
          } else {
            await dbInstance.insert(customerProfiles).values({
              userId: input.userId,
              ...profileUpdates,
            });
          }
        }

        return { success: true, message: 'User updated successfully' };
      }),
});
