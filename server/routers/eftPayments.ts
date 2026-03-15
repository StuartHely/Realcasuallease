import { router, ownerProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql } from "drizzle-orm";
import {
  eftDeposits,
  eftAllocations,
  bookings,
  vacantShopBookings,
  thirdLineBookings,
  shoppingCentres,
  sites,
  vacantShops,
  thirdLineIncome,
  users,
  transactions,
} from "../../drizzle/schema";

const createDeposit = ownerProcedure
  .input(
    z.object({
      depositAmount: z.number().positive(),
      depositDate: z.string(),
      bankReference: z.string().optional(),
      depositorName: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [deposit] = await db
      .insert(eftDeposits)
      .values({
        depositAmount: input.depositAmount.toFixed(2),
        depositDate: new Date(input.depositDate),
        bankReference: input.bankReference ?? null,
        depositorName: input.depositorName ?? null,
        notes: input.notes ?? null,
        allocatedAmount: "0",
        unallocatedAmount: input.depositAmount.toFixed(2),
        recordedBy: ctx.user.id,
      })
      .returning();

    const { writeAudit } = await import("../auditHelper");
    await writeAudit({
      userId: ctx.user.id,
      action: "eft_deposit_created",
      entityType: "eft_deposit",
      entityId: deposit.id,
    });

    return deposit;
  });

const listDeposits = ownerProcedure
  .input(
    z.object({
      status: z
        .enum(["all", "unallocated", "fully_allocated"])
        .optional()
        .default("all"),
    }),
  )
  .query(async ({ input }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return [];

    let query = db.select().from(eftDeposits).orderBy(desc(eftDeposits.createdAt)).$dynamic();

    if (input.status === "unallocated") {
      query = query.where(sql`CAST(${eftDeposits.unallocatedAmount} AS DECIMAL) > 0`);
    } else if (input.status === "fully_allocated") {
      query = query.where(
        sql`CAST(${eftDeposits.unallocatedAmount} AS DECIMAL) = 0 AND CAST(${eftDeposits.allocatedAmount} AS DECIMAL) > 0`,
      );
    }

    return await query;
  });

const getUnpaidInvoices = ownerProcedure
  .input(z.object({ search: z.string().optional() }))
  .query(async ({ input, ctx }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return [];

    const { getScopedOwnerId } = await import("../tenantScope");
    const scopedOwnerId = getScopedOwnerId(ctx.user);

    type UnpaidInvoice = {
      bookingId: number;
      bookingType: "cl" | "vs" | "tli";
      bookingNumber: string;
      customerName: string;
      centreName: string;
      assetLabel: string;
      totalIncGst: number;
      amountPaid: number;
      outstandingBalance: number;
    };

    const results: UnpaidInvoice[] = [];

    // CL bookings
    const clConditions = [
      sql`${bookings.paymentMethod} = 'invoice'`,
      sql`${bookings.status} = 'confirmed'`,
      sql`CAST(${bookings.amountPaid} AS DECIMAL) < CAST(${bookings.totalAmount} AS DECIMAL) + CAST(${bookings.gstAmount} AS DECIMAL)`,
    ];
    if (scopedOwnerId) {
      clConditions.push(sql`${shoppingCentres.ownerId} = ${scopedOwnerId}`);
    }
    if (input.search) {
      const pattern = `%${input.search}%`;
      clConditions.push(
        sql`(${bookings.bookingNumber} ILIKE ${pattern} OR ${users.name} ILIKE ${pattern})`,
      );
    }

    const clRows = await db
      .select({
        bookingId: bookings.id,
        bookingNumber: bookings.bookingNumber,
        customerName: users.name,
        centreName: shoppingCentres.name,
        assetLabel: sites.siteNumber,
        totalAmount: bookings.totalAmount,
        gstAmount: bookings.gstAmount,
        amountPaid: bookings.amountPaid,
      })
      .from(bookings)
      .innerJoin(sites, eq(bookings.siteId, sites.id))
      .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
      .innerJoin(users, eq(bookings.customerId, users.id))
      .where(sql.join(clConditions, sql` AND `));

    for (const row of clRows) {
      const totalIncGst = parseFloat(row.totalAmount) + parseFloat(row.gstAmount);
      const amountPaid = parseFloat(row.amountPaid);
      results.push({
        bookingId: row.bookingId,
        bookingType: "cl",
        bookingNumber: row.bookingNumber,
        customerName: row.customerName || "Unknown",
        centreName: row.centreName,
        assetLabel: row.assetLabel,
        totalIncGst,
        amountPaid,
        outstandingBalance: totalIncGst - amountPaid,
      });
    }

    // VS bookings
    const vsConditions = [
      sql`${vacantShopBookings.paymentMethod} = 'invoice'`,
      sql`${vacantShopBookings.status} = 'confirmed'`,
      sql`CAST(${vacantShopBookings.amountPaid} AS DECIMAL) < CAST(${vacantShopBookings.totalAmount} AS DECIMAL) + CAST(${vacantShopBookings.gstAmount} AS DECIMAL)`,
    ];
    if (scopedOwnerId) {
      vsConditions.push(sql`${shoppingCentres.ownerId} = ${scopedOwnerId}`);
    }
    if (input.search) {
      const pattern = `%${input.search}%`;
      vsConditions.push(
        sql`(${vacantShopBookings.bookingNumber} ILIKE ${pattern} OR ${users.name} ILIKE ${pattern})`,
      );
    }

    const vsRows = await db
      .select({
        bookingId: vacantShopBookings.id,
        bookingNumber: vacantShopBookings.bookingNumber,
        customerName: users.name,
        centreName: shoppingCentres.name,
        assetLabel: vacantShops.shopNumber,
        totalAmount: vacantShopBookings.totalAmount,
        gstAmount: vacantShopBookings.gstAmount,
        amountPaid: vacantShopBookings.amountPaid,
      })
      .from(vacantShopBookings)
      .innerJoin(vacantShops, eq(vacantShopBookings.vacantShopId, vacantShops.id))
      .innerJoin(shoppingCentres, eq(vacantShops.centreId, shoppingCentres.id))
      .innerJoin(users, eq(vacantShopBookings.customerId, users.id))
      .where(sql.join(vsConditions, sql` AND `));

    for (const row of vsRows) {
      const totalIncGst = parseFloat(row.totalAmount) + parseFloat(row.gstAmount);
      const amountPaid = parseFloat(row.amountPaid);
      results.push({
        bookingId: row.bookingId,
        bookingType: "vs",
        bookingNumber: row.bookingNumber,
        customerName: row.customerName || "Unknown",
        centreName: row.centreName,
        assetLabel: row.assetLabel,
        totalIncGst,
        amountPaid,
        outstandingBalance: totalIncGst - amountPaid,
      });
    }

    // TLI bookings
    const tliConditions = [
      sql`${thirdLineBookings.paymentMethod} = 'invoice'`,
      sql`${thirdLineBookings.status} = 'confirmed'`,
      sql`CAST(${thirdLineBookings.amountPaid} AS DECIMAL) < CAST(${thirdLineBookings.totalAmount} AS DECIMAL) + CAST(${thirdLineBookings.gstAmount} AS DECIMAL)`,
    ];
    if (scopedOwnerId) {
      tliConditions.push(sql`${shoppingCentres.ownerId} = ${scopedOwnerId}`);
    }
    if (input.search) {
      const pattern = `%${input.search}%`;
      tliConditions.push(
        sql`(${thirdLineBookings.bookingNumber} ILIKE ${pattern} OR ${users.name} ILIKE ${pattern})`,
      );
    }

    const tliRows = await db
      .select({
        bookingId: thirdLineBookings.id,
        bookingNumber: thirdLineBookings.bookingNumber,
        customerName: users.name,
        centreName: shoppingCentres.name,
        assetLabel: thirdLineIncome.assetNumber,
        totalAmount: thirdLineBookings.totalAmount,
        gstAmount: thirdLineBookings.gstAmount,
        amountPaid: thirdLineBookings.amountPaid,
      })
      .from(thirdLineBookings)
      .innerJoin(thirdLineIncome, eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncome.id))
      .innerJoin(shoppingCentres, eq(thirdLineIncome.centreId, shoppingCentres.id))
      .innerJoin(users, eq(thirdLineBookings.customerId, users.id))
      .where(sql.join(tliConditions, sql` AND `));

    for (const row of tliRows) {
      const totalIncGst = parseFloat(row.totalAmount) + parseFloat(row.gstAmount);
      const amountPaid = parseFloat(row.amountPaid);
      results.push({
        bookingId: row.bookingId,
        bookingType: "tli",
        bookingNumber: row.bookingNumber,
        customerName: row.customerName || "Unknown",
        centreName: row.centreName,
        assetLabel: row.assetLabel,
        totalIncGst,
        amountPaid,
        outstandingBalance: totalIncGst - amountPaid,
      });
    }

    results.sort((a, b) => a.bookingNumber.localeCompare(b.bookingNumber));
    return results;
  });

const allocateDeposit = ownerProcedure
  .input(
    z.object({
      eftDepositId: z.number(),
      allocations: z.array(
        z.object({
          bookingId: z.number(),
          bookingType: z.enum(["cl", "vs", "tli"]),
          amount: z.number().positive(),
        }),
      ),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { getBookingById, getSiteById, getShoppingCentreById, getUserById, getCustomerProfileByUserId, getOwnerById } =
      await import("../db");
    const { getVacantShopBookingById, getThirdLineBookingById } = await import("../assetDb");
    const { getScopedOwnerId } = await import("../tenantScope");
    const scopedOwnerId = getScopedOwnerId(ctx.user);

    // Get deposit
    const [deposit] = await db.select().from(eftDeposits).where(eq(eftDeposits.id, input.eftDepositId));
    if (!deposit) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });
    }

    const totalAllocated = input.allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalAllocated > parseFloat(deposit.unallocatedAmount)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Total allocation exceeds unallocated deposit balance",
      });
    }

    for (const alloc of input.allocations) {
      let booking: any;
      let centreId: number;
      let assetLabel: string;

      if (alloc.bookingType === "cl") {
        booking = await getBookingById(alloc.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: `CL booking ${alloc.bookingId} not found` });
        const site = await getSiteById(booking.siteId);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        centreId = site.centreId;
        assetLabel = site.siteNumber;
      } else if (alloc.bookingType === "vs") {
        booking = await getVacantShopBookingById(alloc.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: `VS booking ${alloc.bookingId} not found` });
        const [shop] = await db.select().from(vacantShops).where(eq(vacantShops.id, booking.vacantShopId));
        if (!shop) throw new TRPCError({ code: "NOT_FOUND", message: "Vacant shop not found" });
        centreId = shop.centreId;
        assetLabel = shop.shopNumber;
      } else {
        booking = await getThirdLineBookingById(alloc.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: `TLI booking ${alloc.bookingId} not found` });
        const [asset] = await db.select().from(thirdLineIncome).where(eq(thirdLineIncome.id, booking.thirdLineIncomeId));
        if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Third line asset not found" });
        centreId = asset.centreId;
        assetLabel = asset.assetNumber;
      }

      if (booking.status !== "confirmed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Booking ${booking.bookingNumber} is not confirmed` });
      }
      if (booking.paymentMethod !== "invoice") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Booking ${booking.bookingNumber} is not an invoice booking` });
      }

      const centre = await getShoppingCentreById(centreId);
      if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });

      if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Booking does not belong to your organisation" });
      }

      const totalIncGst = parseFloat(booking.totalAmount) + parseFloat(booking.gstAmount);
      const currentPaid = parseFloat(booking.amountPaid);
      const outstanding = totalIncGst - currentPaid;

      if (alloc.amount > outstanding + 0.005) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Allocation $${alloc.amount.toFixed(2)} exceeds outstanding balance $${outstanding.toFixed(2)} for ${booking.bookingNumber}`,
        });
      }

      // Insert allocation record
      await db.insert(eftAllocations).values({
        eftDepositId: input.eftDepositId,
        bookingId: alloc.bookingId,
        bookingType: alloc.bookingType,
        amount: alloc.amount.toFixed(2),
      });

      // Update booking amountPaid
      const newAmountPaid = currentPaid + alloc.amount;
      const paidAt = newAmountPaid >= totalIncGst - 0.005 ? new Date() : undefined;

      if (alloc.bookingType === "cl") {
        await db
          .update(bookings)
          .set({
            amountPaid: newAmountPaid.toFixed(2),
            ...(paidAt ? { paidAt } : {}),
          })
          .where(eq(bookings.id, alloc.bookingId));
      } else if (alloc.bookingType === "vs") {
        await db
          .update(vacantShopBookings)
          .set({
            amountPaid: newAmountPaid.toFixed(2),
            ...(paidAt ? { paidAt } : {}),
          })
          .where(eq(vacantShopBookings.id, alloc.bookingId));
      } else {
        await db
          .update(thirdLineBookings)
          .set({
            amountPaid: newAmountPaid.toFixed(2),
            ...(paidAt ? { paidAt } : {}),
          })
          .where(eq(thirdLineBookings.id, alloc.bookingId));
      }

      // If fully paid, create transaction (CL only) and send emails
      if (paidAt) {
        if (alloc.bookingType === "cl") {
          await db.insert(transactions).values({
            bookingId: booking.id,
            ownerId: centre.ownerId,
            type: "booking",
            amount: booking.totalAmount,
            gstAmount: booking.gstAmount,
            gstPercentage: booking.gstPercentage,
            ownerAmount: booking.ownerAmount,
            platformFee: booking.platformFee,
            remitted: false,
            createdAt: new Date(),
          });
        }

        try {
          const customer = await getUserById(booking.customerId);
          const customerProfile = customer ? await getCustomerProfileByUserId(customer.id) : null;

          if (customer && customer.email) {
            const { sendPaymentReceiptEmail } = await import("../_core/bookingNotifications");
            await sendPaymentReceiptEmail({
              bookingNumber: booking.bookingNumber,
              customerName: customer.name || "Customer",
              customerEmail: customer.email,
              centreName: centre.name,
              siteNumber: assetLabel,
              startDate: booking.startDate,
              endDate: booking.endDate,
              totalAmount: booking.totalAmount,
              companyName: customerProfile?.companyName || undefined,
              tradingName: customerProfile?.tradingName || undefined,
              paidAt,
              ownerId: centre.ownerId,
            });
          }

          if (centre.ownerId) {
            const owner = await getOwnerById(centre.ownerId);
            if (owner && owner.email) {
              const { sendOwnerPaymentNotificationEmail } = await import("../_core/bookingNotifications");
              sendOwnerPaymentNotificationEmail({
                ownerEmail: owner.email,
                ownerName: owner.name || "Owner",
                bookingNumber: booking.bookingNumber,
                customerName: customer?.name || "Customer",
                centreName: centre.name,
                siteNumber: assetLabel,
                startDate: booking.startDate,
                endDate: booking.endDate,
                totalAmount: booking.totalAmount,
                ownerAmount: booking.ownerAmount,
                platformFee: booking.platformFee,
                ownerId: centre.ownerId,
                paidAt,
              }).catch((err: any) => console.error("[eftAllocate] Owner notification failed:", err));
            }
          }
        } catch (emailError) {
          console.error("[eftAllocate] Email failed:", emailError);
        }
      }
    }

    // Update deposit totals
    const newAllocated = parseFloat(deposit.allocatedAmount ?? "0") + totalAllocated;
    const newUnallocated = parseFloat(deposit.unallocatedAmount ?? "0") - totalAllocated;
    await db
      .update(eftDeposits)
      .set({
        allocatedAmount: newAllocated.toFixed(2),
        unallocatedAmount: newUnallocated.toFixed(2),
      })
      .where(eq(eftDeposits.id, input.eftDepositId));

    const { writeAudit } = await import("../auditHelper");
    await writeAudit({
      userId: ctx.user.id,
      action: "eft_payment_allocated",
      entityType: "eft_deposit",
      entityId: input.eftDepositId,
      changes: {
        depositId: input.eftDepositId,
        allocations: input.allocations,
        totalAllocated,
      },
    });

    return { success: true, allocationsCount: input.allocations.length, totalAllocated };
  });

const getDepositDetail = ownerProcedure
  .input(z.object({ depositId: z.number() }))
  .query(async ({ input }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [deposit] = await db.select().from(eftDeposits).where(eq(eftDeposits.id, input.depositId));
    if (!deposit) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });
    }

    const allocations = await db
      .select()
      .from(eftAllocations)
      .where(eq(eftAllocations.eftDepositId, input.depositId))
      .orderBy(desc(eftAllocations.createdAt));

    const { getBookingById, getSiteById, getShoppingCentreById, getUserById } = await import("../db");
    const { getVacantShopBookingById, getThirdLineBookingById } = await import("../assetDb");

    const allocationsWithDetails = await Promise.all(
      allocations.map(async (alloc) => {
        let bookingNumber = "";
        let customerName = "Unknown";
        let centreName = "";
        let assetLabel = "";

        if (alloc.bookingType === "cl") {
          const booking = await getBookingById(alloc.bookingId);
          if (booking) {
            bookingNumber = booking.bookingNumber;
            const customer = await getUserById(booking.customerId);
            customerName = customer?.name || "Unknown";
            const site = await getSiteById(booking.siteId);
            if (site) {
              assetLabel = site.siteNumber;
              const centre = await getShoppingCentreById(site.centreId);
              centreName = centre?.name || "";
            }
          }
        } else if (alloc.bookingType === "vs") {
          const booking = await getVacantShopBookingById(alloc.bookingId);
          if (booking) {
            bookingNumber = booking.bookingNumber;
            const customer = await getUserById(booking.customerId);
            customerName = customer?.name || "Unknown";
            const [shop] = await db.select().from(vacantShops).where(eq(vacantShops.id, booking.vacantShopId));
            if (shop) {
              assetLabel = shop.shopNumber;
              const centre = await getShoppingCentreById(shop.centreId);
              centreName = centre?.name || "";
            }
          }
        } else if (alloc.bookingType === "tli") {
          const booking = await getThirdLineBookingById(alloc.bookingId);
          if (booking) {
            bookingNumber = booking.bookingNumber;
            const customer = await getUserById(booking.customerId);
            customerName = customer?.name || "Unknown";
            const [asset] = await db.select().from(thirdLineIncome).where(eq(thirdLineIncome.id, booking.thirdLineIncomeId));
            if (asset) {
              assetLabel = asset.assetNumber;
              const centre = await getShoppingCentreById(asset.centreId);
              centreName = centre?.name || "";
            }
          }
        }

        return {
          ...alloc,
          amount: parseFloat(alloc.amount),
          bookingNumber,
          customerName,
          centreName,
          assetLabel,
        };
      }),
    );

    return {
      ...deposit,
      depositAmount: parseFloat(deposit.depositAmount),
      allocatedAmount: parseFloat(deposit.allocatedAmount),
      unallocatedAmount: parseFloat(deposit.unallocatedAmount),
      allocations: allocationsWithDetails,
    };
  });

const deleteDeposit = adminProcedure
  .input(z.object({ depositId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [deposit] = await db.select().from(eftDeposits).where(eq(eftDeposits.id, input.depositId));
    if (!deposit) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });
    }

    const existingAllocations = await db
      .select({ id: eftAllocations.id })
      .from(eftAllocations)
      .where(eq(eftAllocations.eftDepositId, input.depositId))
      .limit(1);

    if (existingAllocations.length > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot delete deposit with existing allocations",
      });
    }

    await db.delete(eftDeposits).where(eq(eftDeposits.id, input.depositId));

    const { writeAudit } = await import("../auditHelper");
    await writeAudit({
      userId: ctx.user.id,
      action: "eft_deposit_deleted",
      entityType: "eft_deposit",
      entityId: input.depositId,
    });

    return { success: true };
  });

export const eftPaymentsRouter = router({
  createDeposit,
  listDeposits,
  getUnpaidInvoices,
  allocateDeposit,
  getDepositDetail,
  deleteDeposit,
});
