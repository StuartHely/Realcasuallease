import { publicProcedure, protectedProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { getSystemConfig as getSystemConfigDb, updateSystemConfig as updateSystemConfigDb } from "../systemConfigDb";
import { trackImageView, trackImageClick, getTopPerformingImages, getImageAnalyticsBySite } from "../imageAnalyticsDb";
import { getSeasonalRatesBySiteId, getSeasonalRatesByCentreId, createSeasonalRate, updateSeasonalRate, deleteSeasonalRate, getSeasonalRatesForDateRange } from "../seasonalRatesDb";
import { notifyOwner } from "../_core/notification";

export const adminRouter = router({
    getStats: ownerProcedure.query(async ({ ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      const centres = await db.getShoppingCentres(scopedOwnerId ?? undefined);
      const centreIds = new Set(centres.map(c => c.id));
      const allSites = await db.getAllSites();
      const sites = scopedOwnerId ? allSites.filter(s => centreIds.has(s.centreId)) : allSites;
      const allBookings = await db.getAllBookings();
      const siteIdSet = new Set(sites.map(s => s.id));
      const bookings = scopedOwnerId ? allBookings.filter((b: any) => siteIdSet.has(b.siteId)) : allBookings;
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

      // Get VS and TLI bookings for revenue
      const { getDb } = await import('../db');
      const dbInstance = await getDb();
      const { sql: sqlTag } = await import('drizzle-orm');

      let vsRevenue = 0, vsMonthlyRevenue = 0, tliRevenue = 0, tliMonthlyRevenue = 0;

      if (dbInstance) {
        const centreIdArr = centres.map(c => c.id);

        if (centreIdArr.length > 0) {
          const centreIdList = sqlTag.raw(centreIdArr.join(','));
          // VS revenue
          const vsResult = await dbInstance.execute(sqlTag`
            SELECT
              COALESCE(SUM(CASE WHEN vsb.status IN ('confirmed','completed') THEN vsb."totalAmount"::numeric ELSE 0 END), 0) as total,
              COALESCE(SUM(CASE WHEN vsb.status IN ('confirmed','completed') AND vsb."createdAt" >= ${monthStart} THEN vsb."totalAmount"::numeric ELSE 0 END), 0) as monthly
            FROM vacant_shop_bookings vsb
            INNER JOIN vacant_shops vs ON vsb."vacantShopId" = vs.id
            WHERE vs."centreId" IN (${centreIdList})
          `);
          const vsRow = (vsResult.rows || [])[0] as any;
          vsRevenue = parseFloat(vsRow?.total || '0');
          vsMonthlyRevenue = parseFloat(vsRow?.monthly || '0');

          // TLI revenue
          const tliResult = await dbInstance.execute(sqlTag`
            SELECT
              COALESCE(SUM(CASE WHEN tlb.status IN ('confirmed','completed') THEN tlb."totalAmount"::numeric ELSE 0 END), 0) as total,
              COALESCE(SUM(CASE WHEN tlb.status IN ('confirmed','completed') AND tlb."createdAt" >= ${monthStart} THEN tlb."totalAmount"::numeric ELSE 0 END), 0) as monthly
            FROM third_line_bookings tlb
            INNER JOIN third_line_income tli ON tlb."thirdLineIncomeId" = tli.id
            WHERE tli."centreId" IN (${centreIdList})
          `);
          const tliRow = (tliResult.rows || [])[0] as any;
          tliRevenue = parseFloat(tliRow?.total || '0');
          tliMonthlyRevenue = parseFloat(tliRow?.monthly || '0');
        }
      }

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
      
      const pendingCount = bookings.filter((b: any) => b.status === 'pending').length;
      const unpaidOverdue = bookings.filter((b: any) => {
        if (b.status !== 'confirmed' || b.paidAt || !b.approvedAt) return false;
        const due = new Date(b.approvedAt);
        due.setDate(due.getDate() + 14);
        return due < now;
      }).length;

      return {
        totalCentres: centres.length,
        totalSites: sites.length,
        activeBookings: activeBookings.length,
        totalRevenue: totalRevenue + vsRevenue + tliRevenue,
        monthlyRevenue: monthlyRevenue + vsMonthlyRevenue + tliMonthlyRevenue,
        clRevenue: totalRevenue,
        clMonthlyRevenue: monthlyRevenue,
        vsRevenue,
        vsMonthlyRevenue,
        tliRevenue,
        tliMonthlyRevenue,
        totalUsers: users.length,
        recentBookings,
        pendingCount,
        unpaidOverdue,
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
        includeInMainSite: z.boolean().optional(),
        portfolioId: z.number().nullable().optional(),
        contactName: z.string().trim().optional(),
        contactEmail: z.string().trim().optional(),
        contactPhone: z.string().trim().optional(),
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
      .mutation(async ({ input, ctx }) => {
        // Force invoice_only if the owner is an agency
        const owner = await db.getOwnerById(input.ownerId);
        const paymentMode = owner?.isAgency ? "invoice_only" : input.paymentMode;

        const result = await db.createShoppingCentre({
          ...input,
          paymentMode,
        });
        // Refresh location index and search cache for new centre
        import("../locationIndex").then(m => m.refreshLocationIndex()).catch(() => {});
        import("../searchCache").then(m => m.clearSearchCache()).catch(() => {});
        // Auto-geocode the new centre (fire-and-forget)
        if (result?.id) {
          import("../geocode").then(m => m.geocodeCentre(result.id, input)).catch(() => {});
        }
        import("../auditHelper").then(m => m.writeAudit({
          userId: ctx.user.id,
          action: "centre_created",
          entityType: "centre",
          entityId: (result as any)?.id,
          changes: { name: input.name, ownerId: input.ownerId },
        })).catch(() => {});
        return result;
      }),

    updateCentre: ownerProcedure
      .input(z.object({
        id: z.number(),
        ownerId: z.number().optional(),
        name: z.string().trim(),
        address: z.string().trim().optional(),
        suburb: z.string().trim().optional(),
        state: z.string().trim().toUpperCase().optional(),
        postcode: z.string().trim().optional(),
        description: z.string().optional(),
        includeInMainSite: z.boolean().optional(),
        paymentMode: z.enum(["stripe", "stripe_with_exceptions", "invoice_only"]).optional(),
        portfolioId: z.number().nullable().optional(),
        contactName: z.string().trim().optional(),
        contactEmail: z.string().trim().optional(),
        contactPhone: z.string().trim().optional(),
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
      .mutation(async ({ input, ctx }) => {
        const { getScopedOwnerId } = await import('../tenantScope');
        const scopedOwnerId = getScopedOwnerId(ctx.user);
        const centre = await db.getShoppingCentreById(input.id);
        if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const { id, ...updates } = input;
        const result = await db.updateShoppingCentre(id, updates);
        // Refresh location index and search cache when location-relevant fields change
        if (updates.name || updates.suburb || updates.state || updates.postcode || updates.includeInMainSite !== undefined) {
          import("../locationIndex").then(m => m.refreshLocationIndex()).catch(() => {});
          import("../searchCache").then(m => m.clearSearchCache()).catch(() => {});
        }
        import("../auditHelper").then(m => m.writeAudit({
          userId: ctx.user.id,
          action: "centre_updated",
          entityType: "centre",
          entityId: id,
          changes: updates,
        })).catch(() => {});
        return result;
      }),

    deleteCentre: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        import("../auditHelper").then(m => m.writeAudit({
          userId: ctx.user.id,
          action: "centre_deleted",
          entityType: "centre",
          entityId: input.id,
        })).catch(() => {});
        const result = await db.deleteShoppingCentre(input.id);
        import("../locationIndex").then(m => m.refreshLocationIndex()).catch(() => {});
        import("../searchCache").then(m => m.clearSearchCache()).catch(() => {});
        return result;
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
      .mutation(async ({ input, ctx }) => {
        const { getScopedOwnerId } = await import('../tenantScope');
        const scopedOwnerId = getScopedOwnerId(ctx.user);
        if (scopedOwnerId) {
          const centre = await db.getShoppingCentreById(input.centreId);
          if (!centre || centre.ownerId !== scopedOwnerId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }
        const { dailyRate, weeklyRate, weekendRate, outgoingsPerDay, ...rest } = input;
        const result = await db.createSite({
          ...rest,
          pricePerDay: dailyRate && dailyRate.trim() ? dailyRate : null,
          pricePerWeek: weeklyRate && weeklyRate.trim() ? weeklyRate : null,
          weekendPricePerDay: weekendRate && weekendRate.trim() ? weekendRate : null,
          outgoingsPerDay: outgoingsPerDay && outgoingsPerDay.trim() ? outgoingsPerDay : null,
        });
        import("../auditHelper").then(m => m.writeAudit({
          userId: ctx.user.id,
          action: "site_created",
          entityType: "site",
          entityId: (result as any)?.id,
          changes: { centreId: input.centreId, siteNumber: input.siteNumber },
        })).catch(() => {});
        return result;
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
      .mutation(async ({ input, ctx }) => {
        const { getScopedOwnerId } = await import('../tenantScope');
        const scopedOwnerId = getScopedOwnerId(ctx.user);
        if (scopedOwnerId) {
          const site = await db.getSiteById(input.id);
          if (site) {
            const centre = await db.getShoppingCentreById(site.centreId);
            if (!centre || centre.ownerId !== scopedOwnerId) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
            }
          }
        }
        const { id, dailyRate, weeklyRate, weekendRate, outgoingsPerDay, maxTables, ...rest } = input;
        const data: any = { ...rest };
        
        // Map rate field names and sanitize: empty strings → null for decimal columns
        if (dailyRate !== undefined) data.pricePerDay = dailyRate && dailyRate.trim() ? dailyRate : null;
        if (weeklyRate !== undefined) data.pricePerWeek = weeklyRate && weeklyRate.trim() ? weeklyRate : null;
        if (weekendRate !== undefined) data.weekendPricePerDay = weekendRate && weekendRate.trim() ? weekendRate : null;
        if (outgoingsPerDay !== undefined) data.outgoingsPerDay = outgoingsPerDay && outgoingsPerDay.trim() ? outgoingsPerDay : null;
        if (maxTables !== undefined) data.maxTables = (maxTables != null && !isNaN(maxTables)) ? maxTables : null;
        
        // Sanitize optional text fields: empty strings → null for cleaner DB
        if (data.description === '') data.description = null;
        if (data.size === '') data.size = null;
        if (data.restrictions === '') data.restrictions = null;
        
        try {
          const result = await db.updateSite(id, data);
          import("../auditHelper").then(m => m.writeAudit({
            userId: ctx.user.id,
            action: "site_updated",
            entityType: "site",
            entityId: id,
            changes: data,
          })).catch(() => {});
          return result;
        } catch (error: any) {
          console.error('[updateSite] Error:', error.message, { id, data });
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
      .mutation(async ({ input, ctx }) => {
        const { getScopedOwnerId } = await import('../tenantScope');
        const scopedOwnerId = getScopedOwnerId(ctx.user);
        if (scopedOwnerId) {
          const site = await db.getSiteById(input.siteId);
          if (site) {
            const centre = await db.getShoppingCentreById(site.centreId);
            if (!centre || centre.ownerId !== scopedOwnerId) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
            }
          }
        }
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
        const result = await db.saveSiteMarkers(input.markers);
        import("../searchCache").then(m => m.clearSearchCache()).catch(() => {});
        return result;
      }),

    resetSiteMarker: ownerProcedure
      .input(z.object({
        siteId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.resetSiteMarker(input.siteId);
        import("../searchCache").then(m => m.clearSearchCache()).catch(() => {});
        return result;
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

    migrateCentreMap: ownerProcedure
      .input(z.object({ centreId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.migrateCentreMapToFloorLevel(input.centreId);
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

    renameFloorLevel: ownerProcedure
      .input(z.object({ floorLevelId: z.number(), levelName: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        return await db.updateFloorLevel(input.floorLevelId, { levelName: input.levelName });
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

    getSeasonalRatesByCentre: ownerProcedure
      .input(z.object({ centreId: z.number() }))
      .query(async ({ input }) => {
        return await getSeasonalRatesByCentreId(input.centreId);
      }),

    createSeasonalRate: ownerProcedure
      .input(z.object({
        siteId: z.number(),
        name: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        weekdayRate: z.number().positive().optional(),
        weekendRate: z.number().positive().optional(),
        weeklyRate: z.number().positive().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await createSeasonalRate(input);
        const { clearSearchCache } = await import("../searchCache");
        clearSearchCache();
        return result;
      }),

    updateSeasonalRate: ownerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        weekdayRate: z.number().positive().optional(),
        weekendRate: z.number().positive().optional(),
        weeklyRate: z.number().positive().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const result = await updateSeasonalRate(id, data);
        const { clearSearchCache } = await import("../searchCache");
        clearSearchCache();
        return result;
      }),

    deleteSeasonalRate: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const result = await deleteSeasonalRate(input.id);
        const { clearSearchCache } = await import("../searchCache");
        clearSearchCache();
        return result;
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
      .query(async ({ ctx }) => {
        const { scanInsuranceDocument, validateInsurance } = await import('../insuranceScanner');
        const { getScopedOwnerId } = await import('../tenantScope');
        const scopedOwnerId = getScopedOwnerId(ctx.user);
        let pendingBookings = await db.getBookingsByStatus('pending');

        // Tenant scoping — owner roles only see their own centres' bookings
        if (scopedOwnerId) {
          const ownerCentres = await db.getShoppingCentres(scopedOwnerId);
          const ownerCentreIds = new Set(ownerCentres.map(c => c.id));
          pendingBookings = pendingBookings.filter(b => b.centreId != null && ownerCentreIds.has(b.centreId as number));
        }

        // Only show bookings requiring a manual approval decision
        pendingBookings = pendingBookings.filter(b => b.requiresApproval);
        
        const bookingsWithDetails = (await Promise.all(
          pendingBookings
            .map(async (booking) => {
              try {
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
                        reasons.push('Same or Similar Usage on the same date');
                      }
                    }
                  }
                }
              }
              
              if (booking.customUsage) {
                reasons.push('Custom usage type specified');
              }
              
              // Only show the generic reason if no specific reasons were identified
              if (reasons.length === 0 && !site?.instantBooking) {
                reasons.push('Site requires manual approval for all bookings');
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
                } catch (error: any) {
                  console.error('[getPendingApprovals] Error scanning insurance:', error);
                  const isApiMissing = error?.message?.includes('not configured');
                  insuranceValidation = {
                    valid: false,
                    errors: [isApiMissing
                      ? 'Insurance auto-scan unavailable (API key not configured) — please review the document manually'
                      : 'Error scanning insurance document — please review the document manually']
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
              } catch (error) {
                console.error(`[getPendingApprovals] Error processing booking ${booking.id}:`, error);
                return {
                  ...booking,
                  centreName: booking.centreName || 'Unknown Centre',
                  siteNumber: booking.siteNumber || 'Unknown',
                  siteDescription: booking.siteName,
                  customerName: booking.customerName || 'Unknown Customer',
                  customerEmail: booking.customerEmail,
                  usageTypeName: null,
                  approvalReason: 'Error loading details - manual review required',
                  insuranceExpired: false,
                  insuranceScan: null,
                  insuranceValidation: { valid: false, errors: ['Error loading insurance details'] },
                  insuranceDocumentUrl: null,
                };
              }
            })
        )).filter(Boolean);
        
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
        let skipped = 0;
        let updated = 0;
        for (const site of allSites) {
          const multiplier = 1 + (percentageIncrease / 100);
          const baseWeekdayRate = site.pricePerDay ? parseFloat(site.pricePerDay) : 0;
          const baseWeekendRate = site.weekendPricePerDay ? parseFloat(site.weekendPricePerDay) : 0;
          const baseWeeklyRate = site.pricePerWeek ? parseFloat(site.pricePerWeek) : 0;
          
          // Skip sites with no base pricing — creating seasonal rates with $0 is meaningless
          if (baseWeekdayRate === 0 && baseWeekendRate === 0 && baseWeeklyRate === 0) {
            skipped++;
            continue;
          }

          const weekdayRate = baseWeekdayRate > 0 ? Math.round(baseWeekdayRate * multiplier * 100) / 100 : undefined;
          const weekendRate = baseWeekendRate > 0 
            ? Math.round(baseWeekendRate * multiplier * 100) / 100 
            : (baseWeekdayRate > 0 ? Math.round(baseWeekdayRate * multiplier * 100) / 100 : undefined);
          const weeklyRate = baseWeeklyRate > 0 ? Math.round(baseWeeklyRate * multiplier * 100) / 100 : undefined;

          // Check for existing seasonal rate with same name and overlapping dates
          const existing = await getSeasonalRatesForDateRange(site.id, startDate, endDate);
          const duplicate = existing.find(r => r.name === name && r.startDate === startDate && r.endDate === endDate);

          if (duplicate) {
            // Update existing record instead of creating a duplicate
            await updateSeasonalRate(duplicate.id, { weekdayRate, weekendRate, weeklyRate });
            updated++;
          } else {
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
        }

        const { clearSearchCache } = await import("../searchCache");
        clearSearchCache();
        return { created, updated, skipped, totalSites: allSites.length };
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
        const result = await db.recordPayment(input.bookingId, ctx.user.name || 'Admin');
        import("../auditHelper").then(m => m.writeAudit({
          userId: ctx.user.id,
          action: "payment_recorded",
          entityType: "booking",
          entityId: input.bookingId,
        })).catch(() => {});
        return result;
      }),

    triggerPaymentReminders: ownerProcedure
      .mutation(async () => {
        const { sendPaymentReminders } = await import('../paymentReminders');
        return await sendPaymentReminders();
      }),

    // User Registration
    registerUser: ownerProcedure
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
        insuranceDocumentUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const isMegaAdmin = ['mega_admin', 'mega_state_admin'].includes(ctx.user.role);
        const isOwnerSuperAdmin = ctx.user.role === 'owner_super_admin';

        // owner_super_admin can only create owner_viewer scoped to their own agency
        if (!isMegaAdmin) {
          if (!isOwnerSuperAdmin) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins or owner super admins can register users' });
          }
          const ownerRoles = ['owner_viewer', 'owner_centre_manager', 'owner_marketing_manager'];
          if (!ownerRoles.includes(input.role)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Owner super admins can only create viewer and manager roles' });
          }
          if (!ctx.user.assignedOwnerId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account is not assigned to an owner agency' });
          }
          if (input.assignedOwnerId !== ctx.user.assignedOwnerId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only create users for your own agency' });
          }
        }

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

        if (input.companyName || input.insuranceCompany || input.insuranceDocumentUrl) {
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
            insuranceDocumentUrl: input.insuranceDocumentUrl || null,
          });
        }

        import("../auditHelper").then(m => m.writeAudit({
          userId: ctx.user.id,
          action: "user_created",
          entityType: "user",
          entityId: newUser.id,
          changes: { email: input.email, role: input.role, assignedOwnerId: input.assignedOwnerId },
        })).catch(() => {});

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
      .mutation(async ({ input, ctx }) => {
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

        import("../auditHelper").then(m => m.writeAudit({
          userId: ctx.user.id,
          action: "user_updated",
          entityType: "user",
          entityId: input.userId,
          changes: userUpdates,
        })).catch(() => {});

        return { success: true, message: 'User updated successfully' };
      }),

    /**
     * Audit query: find users who only have OAuth/SDK auth (openId set, no passwordHash).
     * If count is zero, the SDK auth fallback in context.ts can be safely removed.
     */
    getOauthOnlyUsers: adminProcedure.query(async () => {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { isNull, and, ne } = await import("drizzle-orm");

      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const oauthOnlyUsers = await dbInstance
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          openId: users.openId,
          role: users.role,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .where(and(isNull(users.passwordHash), ne(users.openId, "")));

      return {
        count: oauthOnlyUsers.length,
        users: oauthOnlyUsers,
        canRemoveSdkFallback: oauthOnlyUsers.length === 0,
      };
    }),

    getPendingCount: ownerProcedure.query(async ({ ctx }) => {
      const { getScopedOwnerId } = await import('../tenantScope');
      const scopedOwnerId = getScopedOwnerId(ctx.user);
      const dbInst = await db.getDb();
      if (!dbInst) return { count: 0 };
      const { bookings, sites, shoppingCentres } = await import('../../drizzle/schema');
      const { eq, and, inArray } = await import('drizzle-orm');
      if (scopedOwnerId) {
        const centreRows = await dbInst.select({ id: shoppingCentres.id }).from(shoppingCentres).where(eq(shoppingCentres.ownerId, scopedOwnerId));
        const centreIds = centreRows.map(c => c.id);
        if (centreIds.length === 0) return { count: 0 };
        const siteRows = await dbInst.select({ id: sites.id }).from(sites).where(inArray(sites.centreId, centreIds));
        const siteIds = siteRows.map(s => s.id);
        if (siteIds.length === 0) return { count: 0 };
        const rows = await dbInst.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.status, 'pending'), eq(bookings.requiresApproval, true), inArray(bookings.siteId, siteIds)));
        return { count: rows.length };
      }
      const rows = await dbInst.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.status, 'pending'), eq(bookings.requiresApproval, true)));
      return { count: rows.length };
    }),

    dbDiagnostics: adminProcedure.query(async () => {
      const dbInst = await db.getDb();
      if (!dbInst) return { error: "No DB connection" };
      const cols = await dbInst.execute(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' ORDER BY ordinal_position`
      );
      const migrations = await dbInst.execute(
        `SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5`
      );
      return { bookingColumns: cols.rows, recentMigrations: migrations.rows };
    }),

    exportAllData: adminProcedure.query(async () => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const {
        owners: ownersTable,
        users: usersTable,
        shoppingCentres: centresTable,
        floorLevels: floorLevelsTable,
        sites: sitesTable,
        usageCategories: usageCategoriesTable,
        siteUsageCategories: siteUsageCategoriesTable,
        thirdLineCategories: thirdLineCategoriesTable,
        thirdLineIncome: thirdLineIncomeTable,
        vacantShops: vacantShopsTable,
        seasonalRates: seasonalRatesTable,
        systemConfig: systemConfigTable,
        faqs: faqsTable,
      } = await import("../../drizzle/schema");

      const [
        ownersData,
        usersData,
        centresData,
        floorLevelsData,
        sitesData,
        usageCategoriesData,
        siteUsageCategoriesData,
        thirdLineCategoriesData,
        thirdLineIncomeData,
        vacantShopsData,
        seasonalRatesData,
        systemConfigData,
        faqsData,
      ] = await Promise.all([
        dbInst.select().from(ownersTable),
        dbInst.select({
          id: usersTable.id,
          openId: usersTable.openId,
          username: usersTable.username,
          name: usersTable.name,
          email: usersTable.email,
          loginMethod: usersTable.loginMethod,
          role: usersTable.role,
          assignedState: usersTable.assignedState,
          allocatedLogoId: usersTable.allocatedLogoId,
          canPayByInvoice: usersTable.canPayByInvoice,
          assignedOwnerId: usersTable.assignedOwnerId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          lastSignedIn: usersTable.lastSignedIn,
        }).from(usersTable),
        dbInst.select().from(centresTable),
        dbInst.select().from(floorLevelsTable),
        dbInst.select().from(sitesTable),
        dbInst.select().from(usageCategoriesTable),
        dbInst.select().from(siteUsageCategoriesTable),
        dbInst.select().from(thirdLineCategoriesTable),
        dbInst.select().from(thirdLineIncomeTable),
        dbInst.select().from(vacantShopsTable),
        dbInst.select().from(seasonalRatesTable),
        dbInst.select().from(systemConfigTable),
        dbInst.select().from(faqsTable),
      ]);

      // Collect map image files as base64
      const fs = await import("fs/promises");
      const path = await import("path");
      const { getPublicDir } = await import("../_core/publicDir");
      const publicDir = getPublicDir();
      const imageFiles: Array<{ path: string; data: string }> = [];

      async function collectImage(urlPath: string | null | undefined) {
        if (!urlPath || urlPath.startsWith("http") || urlPath.startsWith("data:")) return;
        try {
          const filePath = path.join(publicDir, urlPath);
          const buffer = await fs.readFile(filePath);
          imageFiles.push({ path: urlPath, data: buffer.toString("base64") });
        } catch { /* file doesn't exist locally, skip */ }
      }

      // Collect centre maps
      for (const centre of centresData) {
        await collectImage((centre as any).mapImageUrl);
      }
      // Collect floor level maps
      for (const fl of floorLevelsData) {
        await collectImage((fl as any).mapImageUrl);
      }
      // Collect site images (slots 1-4)
      for (const site of sitesData) {
        for (const slot of ["imageUrl1", "imageUrl2", "imageUrl3", "imageUrl4"]) {
          await collectImage((site as any)[slot]);
        }
      }
      // Collect vacant shop images
      for (const vs of vacantShopsData) {
        for (const slot of ["imageUrl1", "imageUrl2", "imageUrl3", "imageUrl4"]) {
          await collectImage((vs as any)[slot]);
        }
      }
      // Collect third line income images
      for (const tli of thirdLineIncomeData) {
        await collectImage((tli as any).imageUrl);
      }

      return {
        exportedAt: new Date().toISOString(),
        tables: {
          owners: ownersData,
          users: usersData,
          shoppingCentres: centresData,
          floorLevels: floorLevelsData,
          sites: sitesData,
          usageCategories: usageCategoriesData,
          siteUsageCategories: siteUsageCategoriesData,
          thirdLineCategories: thirdLineCategoriesData,
          thirdLineIncome: thirdLineIncomeData,
          vacantShops: vacantShopsData,
          seasonalRates: seasonalRatesData,
          systemConfig: systemConfigData,
          faqs: faqsData,
        },
        imageFiles,
      };
    }),

    importAllData: adminProcedure
      .input(z.object({
        exportedAt: z.string(),
        tables: z.object({
          owners: z.array(z.record(z.string(), z.any())).optional(),
          users: z.array(z.record(z.string(), z.any())).optional(),
          shoppingCentres: z.array(z.record(z.string(), z.any())).optional(),
          floorLevels: z.array(z.record(z.string(), z.any())).optional(),
          sites: z.array(z.record(z.string(), z.any())).optional(),
          usageCategories: z.array(z.record(z.string(), z.any())).optional(),
          siteUsageCategories: z.array(z.record(z.string(), z.any())).optional(),
          thirdLineCategories: z.array(z.record(z.string(), z.any())).optional(),
          thirdLineIncome: z.array(z.record(z.string(), z.any())).optional(),
          vacantShops: z.array(z.record(z.string(), z.any())).optional(),
          seasonalRates: z.array(z.record(z.string(), z.any())).optional(),
          systemConfig: z.array(z.record(z.string(), z.any())).optional(),
          faqs: z.array(z.record(z.string(), z.any())).optional(),
        }),
        imageFiles: z.array(z.object({ path: z.string(), data: z.string() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const schema = await import("../../drizzle/schema");
        const { sql } = await import("drizzle-orm");

        const imported: Record<string, number> = {};

        const tableMap: Array<{
          key: keyof typeof input.tables;
          table: any;
          pgName: string;
          skipFields?: string[];
        }> = [
          { key: "owners", table: schema.owners, pgName: "owners" },
          { key: "users", table: schema.users, pgName: "users", skipFields: ["passwordHash"] },
          { key: "shoppingCentres", table: schema.shoppingCentres, pgName: "shopping_centres" },
          { key: "floorLevels", table: schema.floorLevels, pgName: "floor_levels" },
          { key: "sites", table: schema.sites, pgName: "sites" },
          { key: "usageCategories", table: schema.usageCategories, pgName: "usage_categories" },
          { key: "siteUsageCategories", table: schema.siteUsageCategories, pgName: "site_usage_categories" },
          { key: "thirdLineCategories", table: schema.thirdLineCategories, pgName: "third_line_categories" },
          { key: "thirdLineIncome", table: schema.thirdLineIncome, pgName: "third_line_income" },
          { key: "vacantShops", table: schema.vacantShops, pgName: "vacant_shops" },
          { key: "seasonalRates", table: schema.seasonalRates, pgName: "seasonalRates" },
          { key: "systemConfig", table: schema.systemConfig, pgName: "system_config" },
          { key: "faqs", table: schema.faqs, pgName: "faqs" },
        ];

        for (const { key, table, pgName, skipFields } of tableMap) {
          const rows = input.tables[key];
          if (!rows || rows.length === 0) {
            imported[key] = 0;
            continue;
          }

          let count = 0;
          for (const row of rows) {
            const values = { ...row };

            // Remove fields we shouldn't overwrite
            if (skipFields) {
              for (const f of skipFields) {
                delete values[f];
              }
            }

            // Convert date strings back to Date objects for timestamp columns
            for (const [k, v] of Object.entries(values)) {
              if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
                values[k] = new Date(v);
              }
            }

            const updateSet = { ...values };
            delete updateSet.id;

            // Remove passwordHash from update set for users
            if (skipFields) {
              for (const f of skipFields) {
                delete updateSet[f];
              }
            }

            try {
              await dbInst.insert(table).values(values).onConflictDoUpdate({
                target: table.id,
                set: updateSet,
              });
              count++;
            } catch (err: any) {
              console.error(`[importAllData] Error importing ${key} row id=${row.id}:`, err.message);
            }
          }
          imported[key] = count;

          // Sync serial sequence to max(id)+1
          try {
            await dbInst.execute(
              sql.raw(`SELECT setval(pg_get_serial_sequence('${pgName}', 'id'), COALESCE((SELECT MAX(id) FROM "${pgName}"), 1))`)
            );
          } catch (err: any) {
            console.error(`[importAllData] Error syncing sequence for ${pgName}:`, err.message);
          }
        }

        // Write image files — to S3 in production, local disk in dev
        let imagesWritten = 0;
        const pathRemap = new Map<string, string>(); // old local path → new S3 URL

        if (input.imageFiles && input.imageFiles.length > 0) {
          const { ENV } = await import("../_core/env");
          const useS3 = !!ENV.awsS3Bucket;

          if (useS3) {
            const { storagePut } = await import("../storage");
            const pathMod = await import("path");

            for (const file of input.imageFiles) {
              try {
                const buffer = Buffer.from(file.data, "base64");
                const s3Key = file.path.replace(/^\//, "");
                const ext = pathMod.extname(file.path).toLowerCase();
                const contentTypes: Record<string, string> = {
                  ".webp": "image/webp", ".png": "image/png",
                  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                  ".gif": "image/gif", ".svg": "image/svg+xml",
                  ".pdf": "application/pdf",
                };
                const { url } = await storagePut(s3Key, buffer, contentTypes[ext] || "application/octet-stream");
                pathRemap.set(file.path, url);
                imagesWritten++;
              } catch (err: any) {
                console.error(`[importAllData] Error uploading image to S3 ${file.path}:`, err.message);
              }
            }
          } else {
            const fs = await import("fs/promises");
            const pathMod = await import("path");
            const { getPublicDir } = await import("../_core/publicDir");
            const publicDir = getPublicDir();

            for (const file of input.imageFiles) {
              try {
                const filePath = pathMod.join(publicDir, file.path);
                await fs.mkdir(pathMod.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, Buffer.from(file.data, "base64"));
                imagesWritten++;
              } catch (err: any) {
                console.error(`[importAllData] Error writing image ${file.path}:`, err.message);
              }
            }
          }

          // Update DB records to use S3 URLs instead of local paths
          if (pathRemap.size > 0) {
            const { sql: rawSql } = await import("drizzle-orm");
            const imageColumns = [
              { table: "shopping_centres", cols: ["mapImageUrl", "pdfUrl1", "pdfUrl2", "pdfUrl3"] },
              { table: "floor_levels", cols: ["mapImageUrl"] },
              { table: "sites", cols: ["imageUrl1", "imageUrl2", "imageUrl3", "imageUrl4", "panoramaImageUrl"] },
              { table: "vacant_shops", cols: ["imageUrl1", "imageUrl2"] },
              { table: "third_line_income", cols: ["imageUrl1", "imageUrl2"] },
            ];

            for (const { table, cols } of imageColumns) {
              for (const col of cols) {
                for (const [oldPath, newUrl] of Array.from(pathRemap.entries())) {
                  try {
                    await dbInst.execute(
                      rawSql`UPDATE "${rawSql.raw(table)}" SET "${rawSql.raw(col)}" = ${newUrl} WHERE "${rawSql.raw(col)}" = ${oldPath}`
                    );
                  } catch { /* column may not exist for some rows */ }
                }
              }
            }
          }
        }

        return { imported, imagesWritten };
      }),

    // Receipt Management
    previewReceipt: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        if (!booking.paidAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking has not been paid' });

        // Generate a preview receipt number
        const { getDb } = await import('../db');
        const dbInst = await getDb();
        const { receiptSends } = await import('../../drizzle/schema');
        const { eq, count } = await import('drizzle-orm');
        const [result] = await dbInst!.select({ count: count() }).from(receiptSends).where(eq(receiptSends.bookingId, input.bookingId));
        const nextSeq = (result?.count ?? 0) + 1;
        const receiptNumber = `RCT-${booking.bookingNumber}-${String(nextSeq).padStart(3, '0')}`;

        const { generateReceiptPDF } = await import('../receiptGenerator');
        const pdfBase64 = await generateReceiptPDF(input.bookingId, receiptNumber);
        return { pdfBase64, receiptNumber };
      }),

    sendReceipt: adminProcedure
      .input(z.object({
        bookingId: z.number(),
        recipientEmails: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        if (!booking.paidAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking has not been paid' });

        // Validate email addresses (up to 5, comma-separated)
        const emails = input.recipientEmails.split(',').map(e => e.trim()).filter(Boolean);
        if (emails.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least one email is required' });
        if (emails.length > 5) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum 5 email addresses allowed' });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of emails) {
          if (!emailRegex.test(email)) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid email address: ${email}` });
          }
        }

        // Generate receipt number
        const { getDb } = await import('../db');
        const dbInst = await getDb();
        const { receiptSends } = await import('../../drizzle/schema');
        const { eq, count } = await import('drizzle-orm');
        const [result] = await dbInst!.select({ count: count() }).from(receiptSends).where(eq(receiptSends.bookingId, input.bookingId));
        const nextSeq = (result?.count ?? 0) + 1;
        const receiptNumber = `RCT-${booking.bookingNumber}-${String(nextSeq).padStart(3, '0')}`;

        // Generate PDF
        const { generateReceiptPDF } = await import('../receiptGenerator');
        const pdfBase64 = await generateReceiptPDF(input.bookingId, receiptNumber);

        // Get centre name for subject line
        const site = await db.getSiteById(booking.siteId);
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        const centreName = centre?.name || 'Booking';

        // Get branding
        const { getOperatorBranding } = await import('../_core/emailTemplate');
        const branding = await getOperatorBranding(centre?.ownerId);

        // Build email
        const { sendEmail } = await import('../_core/email');
        const subject = `Payment Receipt ${receiptNumber} — ${centreName}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #123047;">Payment Receipt</h2>
            <p>Dear Customer,</p>
            <p>Please find attached your payment receipt for booking <strong>${booking.bookingNumber}</strong> at <strong>${centreName}</strong>.</p>
            <p>This receipt confirms that payment has been received.</p>
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>${branding.teamName}</strong>
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated email. Please do not reply directly to this message.
            </p>
          </div>
        `;

        const sent = await sendEmail({
          to: emails.join(','),
          subject,
          html,
          attachments: [{
            filename: `Receipt-${receiptNumber}.pdf`,
            content: pdfBase64,
            encoding: 'base64' as const,
          }],
        });

        if (!sent) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send receipt email' });
        }

        // Log to receipt_sends table
        await dbInst!.insert(receiptSends).values({
          bookingId: input.bookingId,
          receiptNumber,
          sentBy: ctx.user.id,
          recipientEmails: emails.join(', '),
        });

        // Audit trail
        import('../auditHelper').then(m => m.writeAudit({
          action: 'receipt_sent',
          entityType: 'booking',
          entityId: input.bookingId,
          userId: ctx.user.id,
          changes: { receiptNumber, recipients: emails.join(', ') },
        })).catch(() => {});

        return { receiptNumber, sentTo: emails };
      }),

    getReceiptHistory: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('../db');
        const dbInst = await getDb();
        const { receiptSends, users } = await import('../../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');

        const receipts = await dbInst!
          .select({
            id: receiptSends.id,
            receiptNumber: receiptSends.receiptNumber,
            recipientEmails: receiptSends.recipientEmails,
            createdAt: receiptSends.createdAt,
            sentByName: users.name,
          })
          .from(receiptSends)
          .leftJoin(users, eq(receiptSends.sentBy, users.id))
          .where(eq(receiptSends.bookingId, input.bookingId))
          .orderBy(desc(receiptSends.createdAt));

        return receipts;
      }),
});
