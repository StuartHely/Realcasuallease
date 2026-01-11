import { eq, desc, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  customerProfiles, InsertCustomerProfile,
  owners, InsertOwner,
  floorLevels, InsertFloorLevel,
  shoppingCentres, InsertShoppingCentre,
  sites, InsertSite,
  usageTypes, InsertUsageType,
  usageCategories,
  siteUsageCategories,
  bookings, InsertBooking,
  transactions, InsertTransaction,
  systemConfig, InsertSystemConfig,
  auditLog, InsertAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    if (user.email !== undefined) {
      values.email = user.email;
      updateSet.email = user.email;
    }
    if (user.name !== undefined) {
      values.name = user.name;
      updateSet.name = user.name;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Error upserting user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db.select().from(users).where(eq(users.openId, openId));
  return user || null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user || null;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  // Fetch all users
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  
  // Fetch all customer profiles
  const allProfiles = await db.select().from(customerProfiles);
  
  // Create a map of userId to profile
  const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
  
  // Map users with their profiles
  return allUsers.map(user => {
    const profile = profileMap.get(user.id);
    return {
      ...user,
      companyName: profile?.companyName || null,
      website: profile?.website || null,
      abn: profile?.abn || null,
      streetAddress: profile?.streetAddress || null,
      city: profile?.city || null,
      state: profile?.state || null,
      postcode: profile?.postcode || null,
      productCategory: profile?.productCategory || null,
      productDetails: profile?.productDetails || null,
      insuranceCompany: profile?.insuranceCompany || null,
      insurancePolicyNumber: profile?.insurancePolicyNumber || null,
      insuranceAmount: profile?.insuranceAmount || null,
      insuranceExpiry: profile?.insuranceExpiry || null,
      insuranceDocumentUrl: profile?.insuranceDocumentUrl || null,
    };
  });
}

export async function getCustomerProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId));
  return profile || null;
}

export async function createCustomerProfile(profile: InsertCustomerProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(customerProfiles).values(profile);
}

export async function updateCustomerProfile(userId: number, updates: Partial<InsertCustomerProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(customerProfiles).set(updates).where(eq(customerProfiles.userId, userId));
}

export async function createOwner(owner: InsertOwner) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(owners).values(owner);
}

export async function getOwners() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(owners);
}

export async function getOwnerById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [owner] = await db.select().from(owners).where(eq(owners.id, id));
  return owner || null;
}

export async function getShoppingCentres() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(shoppingCentres).orderBy(shoppingCentres.name);
}

export async function getShoppingCentreById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [centre] = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, id));
  
  if (!centre) return null;
  
  // Get the first floor level's map image URL if it exists
  const [firstFloor] = await db
    .select({ mapImageUrl: floorLevels.mapImageUrl })
    .from(floorLevels)
    .where(eq(floorLevels.centreId, id))
    .orderBy(floorLevels.displayOrder)
    .limit(1);
  
  return {
    ...centre,
    mapImageUrl: firstFloor?.mapImageUrl || centre.mapImageUrl,
  };
}

export async function createShoppingCentre(centre: InsertShoppingCentre) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(shoppingCentres).values(centre);
}

export async function updateShoppingCentre(id: number, updates: Partial<InsertShoppingCentre>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(shoppingCentres).set(updates).where(eq(shoppingCentres.id, id));
}

export async function deleteShoppingCentre(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(shoppingCentres).where(eq(shoppingCentres.id, id));
}

export async function getSites() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(sites);
}

export async function getSiteById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  return site || null;
}

export async function getSitesByCentreId(centreId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(sites).where(eq(sites.centreId, centreId));
}

export async function createSite(site: InsertSite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(sites).values(site);
}

export async function updateSite(id: number, updates: Partial<InsertSite>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(sites).set(updates).where(eq(sites.id, id));
}

export async function deleteSite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(sites).where(eq(sites.id, id));
}

export async function getUsageTypes() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(usageTypes);
}

export async function getUsageTypeById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [usageType] = await db.select().from(usageTypes).where(eq(usageTypes.id, id));
  return usageType || null;
}

export async function createUsageType(usageType: InsertUsageType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(usageTypes).values(usageType);
}

export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(bookings).values(booking);
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
  return booking || null;
}

export async function getBookingsBySiteId(siteId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(bookings).where(eq(bookings.siteId, siteId));
}

export async function getBookingsByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  const bookingsList = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      siteId: bookings.siteId,
      siteName: sites.description,
      siteNumber: sites.siteNumber,
      centreName: shoppingCentres.name,
      centreId: shoppingCentres.id,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      status: bookings.status,
      requiresApproval: bookings.requiresApproval,
      approvedAt: bookings.approvedAt,
      createdAt: bookings.createdAt,
      usageTypeId: bookings.usageTypeId,
      usageCategoryId: bookings.usageCategoryId,
      additionalCategoryText: bookings.additionalCategoryText,
      customUsage: bookings.customUsage,
      tablesRequested: bookings.tablesRequested,
      chairsRequested: bookings.chairsRequested,
    })
    .from(bookings)
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));

  return bookingsList;
}

// Booking management
export async function getBookingsByStatus(status?: "pending" | "confirmed" | "cancelled" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const query = db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      siteId: bookings.siteId,
      customerId: bookings.customerId,
      customerName: users.name,
      customerEmail: users.email,
      siteName: sites.description,
      centreName: shoppingCentres.name,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      status: bookings.status,
      requiresApproval: bookings.requiresApproval,
      approvedBy: bookings.approvedBy,
      approvedAt: bookings.approvedAt,
      usageTypeId: bookings.usageTypeId,
      usageCategoryId: bookings.usageCategoryId,
      additionalCategoryText: bookings.additionalCategoryText,
      customUsage: bookings.customUsage,
      tablesRequested: bookings.tablesRequested,
      chairsRequested: bookings.chairsRequested,
      paymentMethod: bookings.paymentMethod,
      paidAt: bookings.paidAt,
      paymentDueDate: bookings.paymentDueDate,
      remindersSent: bookings.remindersSent,
      lastReminderSent: bookings.lastReminderSent,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .orderBy(desc(bookings.createdAt));

  if (status) {
    return await query.where(eq(bookings.status, status));
  }

  return await query;
}

// Get unpaid invoice bookings (regardless of status)
export async function getUnpaidInvoiceBookings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      siteId: bookings.siteId,
      customerId: bookings.customerId,
      customerName: users.name,
      customerEmail: users.email,
      siteName: sites.description,
      centreName: shoppingCentres.name,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      status: bookings.status,
      requiresApproval: bookings.requiresApproval,
      approvedBy: bookings.approvedBy,
      approvedAt: bookings.approvedAt,
      usageTypeId: bookings.usageTypeId,
      usageCategoryId: bookings.usageCategoryId,
      additionalCategoryText: bookings.additionalCategoryText,
      customUsage: bookings.customUsage,
      tablesRequested: bookings.tablesRequested,
      chairsRequested: bookings.chairsRequested,
      paymentMethod: bookings.paymentMethod,
      paidAt: bookings.paidAt,
      paymentDueDate: bookings.paymentDueDate,
      remindersSent: bookings.remindersSent,
      lastReminderSent: bookings.lastReminderSent,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(
      and(
        eq(bookings.paymentMethod, "invoice"),
        isNull(bookings.paidAt)
      )
    )
    .orderBy(desc(bookings.createdAt));
}

export async function approveBooking(bookingId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get booking to check payment method
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  return await db.update(bookings).set({
    status: "confirmed",
    approvedBy,
    approvedAt: new Date(),
  }).where(eq(bookings.id, bookingId));
}

export async function rejectBooking(bookingId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(bookings).set({
    status: "rejected",
    rejectionReason: reason,
  }).where(eq(bookings.id, bookingId));
}

export async function updateUserInvoiceFlag(userId: number, canPayByInvoice: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(users).set({ canPayByInvoice }).where(eq(users.id, userId));
}

export async function createTransaction(transaction: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(transactions).values(transaction);
}

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(auditLog).values(log);
}

export async function getAuditLogs() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(auditLog).orderBy(desc(auditLog.timestamp));
}

// Floor Levels
export async function getFloorLevelsByCentreId(centreId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(floorLevels)
    .where(eq(floorLevels.centreId, centreId))
    .orderBy(floorLevels.displayOrder);
}

export async function getFloorLevelById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [level] = await db.select().from(floorLevels).where(eq(floorLevels.id, id));
  return level || null;
}

export async function createFloorLevel(level: InsertFloorLevel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(floorLevels).values(level);
}

export async function updateFloorLevel(id: number, updates: Partial<InsertFloorLevel>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(floorLevels).set(updates).where(eq(floorLevels.id, id));
}

export async function deleteFloorLevel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(floorLevels).where(eq(floorLevels.id, id));
}

export async function resetSiteMarker(siteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(sites).set({
    mapMarkerX: null,
    mapMarkerY: null,
  }).where(eq(sites.id, siteId));
}

export async function searchInvoiceBookings(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const lowerQuery = query.toLowerCase().trim();
  
  // Search by booking number or company name
  const results = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      siteId: bookings.siteId,
      customerId: bookings.customerId,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      ownerAmount: bookings.ownerAmount,
      platformFee: bookings.platformFee,
      status: bookings.status,
      paymentMethod: bookings.paymentMethod,
      paidAt: bookings.paidAt,
      createdAt: bookings.createdAt,
      // Site and centre info
      siteNumber: sites.siteNumber,
      centreName: shoppingCentres.name,
      // Customer info
      customerName: users.name,
      customerEmail: users.email,
      companyName: customerProfiles.companyName,
    })
    .from(bookings)
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .innerJoin(users, eq(bookings.customerId, users.id))
    .leftJoin(customerProfiles, eq(users.id, customerProfiles.userId))
    .where(eq(bookings.paymentMethod, 'invoice'));
  
  // Filter results by query (booking number or company name)
  return results.filter(booking => {
    const bookingNumber = (booking.bookingNumber || '').toLowerCase();
    const companyName = (booking.companyName || '').toLowerCase();
    
    return bookingNumber.includes(lowerQuery) || companyName.includes(lowerQuery);
  });
}

/**
 * Record payment for an invoice booking and trigger payment splits
 */
export async function recordPayment(bookingId: number, recordedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get booking details
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }
  
  if (booking.paymentMethod !== 'invoice') {
    throw new Error("This booking is not an invoice booking");
  }
  
  if (booking.paidAt) {
    throw new Error("Payment has already been recorded for this booking");
  }
  
  // Update booking with payment details
  await db.update(bookings)
    .set({
      paidAt: new Date(),
      // paymentRecordedBy stores the admin's name as string for audit trail
    })
    .where(eq(bookings.id, bookingId));
  
  // Create transaction records for payment splits
  const site = await getSiteById(booking.siteId);
  if (!site) {
    throw new Error("Site not found");
  }
  
  const centre = await getShoppingCentreById(site.centreId);
  if (!centre) {
    throw new Error("Centre not found");
  }
  
  // Create transaction record for this booking
  await db.insert(transactions).values({
    bookingId: booking.id,
    ownerId: centre.ownerId,
    type: 'booking',
    amount: booking.totalAmount,
    gstAmount: booking.gstAmount,
    gstPercentage: booking.gstPercentage,
    ownerAmount: booking.ownerAmount,
    platformFee: booking.platformFee,
    remitted: false,
    createdAt: new Date(),
  });
  
  return { success: true };
}

export async function updateSiteFloorAssignments(assignments: Array<{ siteId: number; floorLevelId: number | null }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update each site's floorLevelId
  for (const assignment of assignments) {
    await db.update(sites)
      .set({ floorLevelId: assignment.floorLevelId })
      .where(eq(sites.id, assignment.siteId));
  }
  
  return { success: true, updated: assignments.length };
}
