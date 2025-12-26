import { eq, and, gte, lte, sql, or, like, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  customerProfiles, InsertCustomerProfile,
  owners, InsertOwner,
  shoppingCentres, InsertShoppingCentre,
  sites, InsertSite,
  usageTypes, InsertUsageType,
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

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'mega_admin';
      updateSet.role = 'mega_admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Owner operations
export async function createOwner(owner: InsertOwner) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(owners).values(owner);
  return result;
}

export async function getOwners() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(owners);
}

export async function getOwnerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(owners).where(eq(owners.id, id)).limit(1);
  return result[0];
}

export async function updateOwner(id: number, data: Partial<InsertOwner>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(owners).set(data).where(eq(owners.id, id));
}

// Shopping Centre operations
export async function createShoppingCentre(centre: InsertShoppingCentre) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(shoppingCentres).values(centre);
  return result;
}

export async function getShoppingCentres() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(shoppingCentres);
}

export async function getShoppingCentreById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, id)).limit(1);
  return result[0];
}

export async function searchShoppingCentres(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lowerQuery = query.toLowerCase();
  return await db.select().from(shoppingCentres).where(
    or(
      sql`LOWER(${shoppingCentres.name}) LIKE ${`%${lowerQuery}%`}`,
      sql`LOWER(${shoppingCentres.suburb}) LIKE ${`%${lowerQuery}%`}`,
      sql`LOWER(${shoppingCentres.city}) LIKE ${`%${lowerQuery}%`}`
    )
  );
}

export async function updateShoppingCentre(id: number, data: Partial<InsertShoppingCentre>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(shoppingCentres).set(data).where(eq(shoppingCentres.id, id));
}

// Site operations
export async function createSite(site: InsertSite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sites).values(site);
  return result;
}

export async function getSitesByCentreId(centreId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(sites).where(eq(sites.centreId, centreId));
}

export async function getSiteById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return result[0];
}

export async function updateSite(id: number, data: Partial<InsertSite>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(sites).set(data).where(eq(sites.id, id));
}

// Booking operations
export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookings).values(booking);
  return result;
}

export async function getBookingsBySiteId(siteId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(bookings).where(
    and(
      eq(bookings.siteId, siteId),
      or(
        and(gte(bookings.startDate, startDate), lte(bookings.startDate, endDate)),
        and(gte(bookings.endDate, startDate), lte(bookings.endDate, endDate)),
        and(lte(bookings.startDate, startDate), gte(bookings.endDate, endDate))
      )
    )
  );
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result[0];
}

export async function updateBooking(id: number, data: Partial<InsertBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(bookings).set(data).where(eq(bookings.id, id));
}

export async function getBookingsByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(bookings).where(eq(bookings.customerId, customerId)).orderBy(desc(bookings.createdAt));
}

// Customer Profile operations
export async function createCustomerProfile(profile: InsertCustomerProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customerProfiles).values(profile);
  return result;
}

export async function getCustomerProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function updateCustomerProfile(userId: number, data: Partial<InsertCustomerProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(customerProfiles).set(data).where(eq(customerProfiles.userId, userId));
}

// Usage Type operations
export async function createUsageType(usageType: InsertUsageType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(usageTypes).values(usageType);
  return result;
}

export async function getUsageTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(usageTypes).where(eq(usageTypes.isActive, true));
}

// Transaction operations
export async function createTransaction(transaction: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(transaction);
  return result;
}

export async function getTransactionsByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(transactions).where(eq(transactions.ownerId, ownerId));
}

// System Config operations
export async function getSystemConfig(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  return result[0];
}

export async function setSystemConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(systemConfig).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

// Audit Log operations
export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(auditLog).values(log);
  return result;
}

export async function getAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}
