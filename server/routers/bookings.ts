import { publicProcedure, protectedProcedure, ownerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail } from "../_core/bookingNotifications";
import { getConfigValue } from "../systemConfigDb";

export const bookingsRouter = router({
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
        bringingOwnTables: z.boolean().optional().default(false),
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
        const { totalAmount, weekdayCount, weekendCount } = await import("../bookingCalculation").then(m => 
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

        // Generate booking number with abbreviated centre code: {CODE}-{YYYYMMDD}-{SEQ}
        // Example: CAMP-20260601-001 (Campbelltown Mall)
        const { getCentreCodeForBooking } = await import('../centreCodeHelper');
        const centreCode = getCentreCodeForBooking(centre);
        const dateStr = new Date(input.startDate).toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
        const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 001-999
        const bookingNumber = `${centreCode}-${dateStr}-${randomSeq}`;

        // Check equipment availability if requested
        let equipmentWarning: string | undefined;
        if ((input.tablesRequested || 0) > 0 || (input.chairsRequested || 0) > 0) {
          const { checkEquipmentAvailability } = await import("../equipmentAvailability");
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

        // If the site has NO categories configured at all, force manual approval
        const { getApprovedCategoriesForSite } = await import("../usageCategoriesDb");
        const siteApprovedCategories = await getApprovedCategoriesForSite(input.siteId);
        if (siteApprovedCategories.length === 0) {
          requiresApproval = true;
        }
        
        if (!requiresApproval && input.usageCategoryId) {
          // Check if additional text was provided (triggers manual approval)
          if (input.additionalCategoryText && input.additionalCategoryText.trim().length > 0) {
            requiresApproval = true;
          } else {
            // Check if category is approved for this site
            const { isCategoryApprovedForSite } = await import("../usageCategoriesDb");
            
            if (siteApprovedCategories.length === 0) {
              requiresApproval = true;
            } else {
              // Approvals exist - check if this specific category is approved
              const isApproved = await isCategoryApprovedForSite(input.siteId, input.usageCategoryId);
              
              if (!isApproved) {
                requiresApproval = true;
              } else {
                // Category is explicitly approved - check for overlapping bookings from OTHER customers
                // This ensures category exclusivity: only one vendor per category at a time
              const { getDb } = await import("../db");
              const { bookings, sites: sitesTable } = await import("../../drizzle/schema");
              const { eq, and, ne, or, lte, gte } = await import("drizzle-orm");
              const dbInstance = await getDb();
              if (dbInstance) {
                // Get the centre ID for the current site
                const currentSite = await dbInstance.select().from(sitesTable)
                  .where(eq(sitesTable.id, input.siteId))
                  .limit(1);
                
                if (currentSite.length > 0) {
                  const centreId = currentSite[0].centreId;
                  
                  // Find overlapping bookings from DIFFERENT customers with same category at same centre
                  // Date overlap logic: (newStart <= existingEnd) AND (newEnd >= existingStart)
                  const overlappingBookings = await dbInstance.select({
                    bookingId: bookings.id,
                    customerId: bookings.customerId,
                    startDate: bookings.startDate,
                    endDate: bookings.endDate,
                  })
                    .from(bookings)
                    .innerJoin(sitesTable, eq(bookings.siteId, sitesTable.id))
                    .where(and(
                      ne(bookings.customerId, ctx.user.id), // DIFFERENT customer
                      eq(bookings.usageCategoryId, input.usageCategoryId), // SAME category
                      eq(sitesTable.centreId, centreId), // SAME centre
                      or(
                        eq(bookings.status, 'pending'),
                        eq(bookings.status, 'confirmed')
                      ), // Only active bookings
                      // Date overlap check
                      lte(bookings.startDate, input.endDate),
                      gte(bookings.endDate, input.startDate)
                    ));
                  
                  if (overlappingBookings.length > 0) {
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

        // Resolve payment method from centre payment mode + user eligibility
        const currentUser = await db.getUserByOpenId(ctx.user.openId);
        const canPayByInvoice = currentUser?.canPayByInvoice || false;
        const { resolvePaymentMethod } = await import("../paymentModeHelper");
        const paymentMethod = resolvePaymentMethod(centre.paymentMode, canPayByInvoice);

        // Check insurance expiry date
        const customerProfile = await db.getCustomerProfileByUserId(ctx.user.id);
        let insuranceExpired = false;
        
        if (customerProfile?.insuranceExpiry) {
          const insuranceExpiryDate = new Date(customerProfile.insuranceExpiry);
          const bookingEndDate = new Date(input.endDate);
          
          // If insurance expires before booking end date, flag for manual approval
          if (insuranceExpiryDate < bookingEndDate) {
            requiresApproval = true;
            insuranceExpired = true;
          }
        }

        // Calculate payment due date for invoice bookings (7 days from booking creation)
        const paymentDueDate = paymentMethod === "invoice" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

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
          gstPercentage: (gstRate * 100).toFixed(2), // Store GST percentage at time of booking
          ownerAmount: ownerAmount.toFixed(2),
          platformFee: platformFee.toFixed(2),
          paymentMethod,
          paymentDueDate: paymentDueDate,
          status: requiresApproval ? "pending" : (site.instantBooking ? "confirmed" : "pending"),
          requiresApproval,
          tablesRequested: input.tablesRequested || 0,
          chairsRequested: input.chairsRequested || 0,
          bringingOwnTables: input.bringingOwnTables || false,
        });
        
        // Record initial status in history
        const bookingId = result[0].id;
        const initialStatus = requiresApproval ? "pending" : (site.instantBooking ? "confirmed" : "pending");
        await db.recordBookingCreated(bookingId, initialStatus as "pending" | "confirmed", ctx.user.id, ctx.user.name || undefined);

        // Fire-and-forget invoice dispatch for auto-confirmed bookings
        if (initialStatus === "confirmed") {
          import("../invoiceDispatch").then(m => m.dispatchInvoiceIfRequired(bookingId)).catch(() => {});
        }

        return {
          bookingId,
          bookingNumber,
          totalAmount,
          requiresApproval,
          insuranceExpired,
          canPayByInvoice,
          paymentMethod,
          equipmentWarning,
          costBreakdown: {
            weekdayCount,
            weekendCount,
            weekdayRate: Number(site.pricePerDay),
            weekendRate: site.weekendPricePerDay ? Number(site.weekendPricePerDay) : Number(site.pricePerDay),
            outgoingsPerDay: site.outgoingsPerDay ? Number(site.outgoingsPerDay) : 0,
            totalOutgoings: (site.outgoingsPerDay ? Number(site.outgoingsPerDay) : 0) * (weekdayCount + weekendCount),
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
        const { totalAmount, weekdayCount, weekendCount, seasonalDays } = await import("../bookingCalculation").then(m => 
          m.calculateBookingCost(site, input.startDate, input.endDate)
        );

        // Get GST rate
        const gstValue = await getConfigValue("gst_percentage");
        const gstRate = gstValue ? Number(gstValue) / 100 : 0.1;
        const gstAmount = totalAmount * gstRate;

        const outgoingsPerDay = site.outgoingsPerDay ? Number(site.outgoingsPerDay) : 0;
        const totalOutgoings = outgoingsPerDay * (weekdayCount + weekendCount);

        return {
          weekdayCount,
          weekendCount,
          weekdayRate: Number(site.pricePerDay),
          weekendRate: site.weekendPricePerDay ? Number(site.weekendPricePerDay) : Number(site.pricePerDay),
          outgoingsPerDay,
          totalOutgoings,
          subtotal: totalAmount,
          gstAmount,
          gstPercentage: gstRate * 100, // Return current GST percentage
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

    list: ownerProcedure
      .input(z.object({
        status: z.enum(["pending", "confirmed", "cancelled", "completed", "unpaid", "rejected"]).optional(),
      }))
      .query(async ({ input }) => {
        // Handle "unpaid" status specially - it's not a database status
        if (input.status === "unpaid") {
          return await db.getUnpaidInvoiceBookings();
        }
        return await db.getBookingsByStatus(input.status);
      }),

    approve: ownerProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        
        if (booking.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending bookings can be approved" });
        }

        await db.approveBooking(input.bookingId, ctx.user.id, ctx.user.name || undefined);
        
        // Send confirmation email to customer
        const site = await db.getSiteById(booking.siteId);
        const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
        const customer = await db.getUserById(booking.customerId);
        const customerProfile = customer ? await db.getCustomerProfileByUserId(customer.id) : null;
        
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
            companyName: customerProfile?.companyName || undefined,
            tradingName: customerProfile?.tradingName || undefined,
          });
        }

        // Fire-and-forget invoice dispatch after approval
        import("../invoiceDispatch").then(m => m.dispatchInvoiceIfRequired(input.bookingId)).catch(() => {});
        
        return { success: true };
      }),

    reject: ownerProcedure
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

        await db.rejectBooking(input.bookingId, input.reason, ctx.user.id, ctx.user.name || undefined);
        
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

    getPendingApprovals: ownerProcedure
      .input(z.object({
        status: z.enum(["pending", "confirmed", "rejected", "all"]).default("pending"),
      }))
      .query(async ({ input }) => {
        const { getDb } = await import("../db");
        const { bookings, sites, shoppingCentres, users, usageCategories, customerProfiles } = await import("../../drizzle/schema");
        const { eq, and, inArray } = await import("drizzle-orm");
        const { scanInsuranceDocument, validateInsurance } = await import('../insuranceScanner');
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Build where clause based on status filter
        const whereClause = input.status === "all" 
          ? undefined 
          : eq(bookings.status, input.status);

        // Fetch bookings with joined data INCLUDING customer profile
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
            // Insurance info from customer profile
            insuranceDocumentUrl: customerProfiles.insuranceDocumentUrl,
            insuranceCompany: customerProfiles.insuranceCompany,
            insurancePolicyNo: customerProfiles.insurancePolicyNo,
            insuranceAmount: customerProfiles.insuranceAmount,
            insuranceExpiry: customerProfiles.insuranceExpiry,
          })
          .from(bookings)
          .innerJoin(users, eq(bookings.customerId, users.id))
          .innerJoin(sites, eq(bookings.siteId, sites.id))
          .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
          .leftJoin(usageCategories, eq(bookings.usageCategoryId, usageCategories.id))
          .leftJoin(customerProfiles, eq(users.id, customerProfiles.userId))
          .where(whereClause)
          .orderBy(bookings.createdAt);

        // For each booking, scan insurance if URL exists and validate
        const bookingsWithInsuranceStatus = await Promise.all(
          bookingsList.map(async (booking) => {
            let insuranceScanResult = null;
            let insuranceValidation = null;

            // If customer has uploaded insurance document, scan it
            if (booking.insuranceDocumentUrl) {
              try {
                const scanResult = await scanInsuranceDocument(booking.insuranceDocumentUrl);
                insuranceScanResult = scanResult;
                insuranceValidation = validateInsurance(scanResult);
              } catch (error) {
                console.error('[getPendingApprovals] Error scanning insurance:', error);
                insuranceValidation = {
                  valid: false,
                  errors: ['Error scanning insurance document - manual review required']
                };
              }
            } else {
              // No insurance document uploaded
              insuranceValidation = {
                valid: false,
                errors: ['No insurance document uploaded']
              };
            }

            return {
              ...booking,
              insuranceScan: insuranceScanResult,
              insuranceValidation: insuranceValidation,
            };
          })
        );

        return bookingsWithInsuranceStatus;
      }),

    // Allow customer to update insurance for their booking
    updateBookingInsurance: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        base64Document: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get the booking and verify ownership
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        }

        // Only the customer who made the booking can update insurance
        if (booking.customerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only update insurance for your own bookings" });
        }

        // Only allow updating insurance for pending or rejected bookings
        if (booking.status !== "pending" && booking.status !== "rejected") {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Insurance can only be updated for pending or rejected bookings" 
          });
        }

        // Upload the new insurance document
        const { storagePut } = await import('../storage');
        const base64Data = input.base64Document.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileKey = `insurance/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Scan the new insurance document
        const { scanInsuranceDocument, validateInsurance } = await import('../insuranceScanner');
        const scanResult = await scanInsuranceDocument(url);
        const validation = validateInsurance(scanResult);

        // Update customer profile with new insurance data
        await db.updateCustomerProfile(ctx.user.id, {
          insuranceDocumentUrl: url,
          insuranceCompany: scanResult.insuranceCompany,
          insurancePolicyNo: scanResult.policyNumber,
          insuranceAmount: scanResult.insuredAmount ? scanResult.insuredAmount.toString() : null,
          insuranceExpiry: scanResult.expiryDate ? new Date(scanResult.expiryDate) : null,
        });

        // If insurance is now valid AND booking was rejected, move it back to pending
        if (validation.valid && booking.status === "rejected") {
          await db.updateBookingStatus(input.bookingId, "pending", ctx.user.id, ctx.user.name || undefined);
          
          // Notify shopping centre that booking needs re-review
          const site = await db.getSiteById(booking.siteId);
          const centre = site ? await db.getShoppingCentreById(site.centreId) : null;
          
          if (centre) {
            console.log(`[Insurance Update] Booking ${booking.bookingNumber} returned to pending after valid insurance upload`);
          }
        }

        return {
          success: true,
          insuranceValid: validation.valid,
          errors: validation.errors,
          bookingStatus: validation.valid && booking.status === "rejected" ? "pending" : booking.status,
          message: validation.valid 
            ? "Insurance uploaded successfully and booking moved to pending for review" 
            : "Insurance uploaded but has issues - please correct and re-upload",
        };
      }),
});
