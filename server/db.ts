import { eq, and, gte, lte, sql, or, like, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  customerProfiles, InsertCustomerProfile,
  owners, InsertOwner,
  floorLevels, InsertFloorLevel,
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
  const insertId = Number(result[0].insertId);
  const created = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, insertId)).limit(1);
  return created[0];
}

export async function getShoppingCentres() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(shoppingCentres);
}

export async function getShoppingCentreById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get centre with first available floor level's map
  const centreResult = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, id)).limit(1);
  const centre = centreResult[0];
  
  if (!centre) return undefined;
  
  // Get first floor level with a map image
  const floorResult = await db.select()
    .from(floorLevels)
    .where(eq(floorLevels.centreId, id))
    .orderBy(floorLevels.levelNumber)
    .limit(1);
  
  const firstFloor = floorResult[0];
  
  // Add mapImageUrl from first floor level if available
  return {
    ...centre,
    mapImageUrl: firstFloor?.mapImageUrl || null
  };
}

export async function getShoppingCentresByState(state: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(shoppingCentres).where(eq(shoppingCentres.state, state));
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Check if query fuzzy matches target with tolerance
function fuzzyMatch(query: string, target: string, tolerance: number = 2): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();
  
  // Exact substring match (fastest)
  if (lowerTarget.includes(lowerQuery)) {
    return true;
  }
  
  // For very short queries (< 4 chars), only allow exact matches to avoid false positives
  if (lowerQuery.length < 4) {
    return false;
  }
  
  // Split target into words and check each
  const words = lowerTarget.split(/\s+/);
  for (const word of words) {
    // Check if word starts with query (common case)
    if (word.startsWith(lowerQuery)) {
      return true;
    }
    
    // Fuzzy match with Levenshtein distance
    // Adjust tolerance based on query length (longer queries = more tolerance)
    const adjustedTolerance = lowerQuery.length <= 6 ? 1 : tolerance;
    const distance = levenshteinDistance(lowerQuery, word);
    if (distance <= adjustedTolerance) {
      return true;
    }
    
    // Also check if query is close to substring of word
    if (word.length > lowerQuery.length) {
      for (let i = 0; i <= word.length - lowerQuery.length; i++) {
        const substring = word.substring(i, i + lowerQuery.length);
        const substringDistance = levenshteinDistance(lowerQuery, substring);
        if (substringDistance <= adjustedTolerance) {
          return true;
        }
      }
    }
  }
  
  return false;
}

export async function searchShoppingCentres(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Parse query for site-specific patterns (e.g., "Pacific Square Site 2")
  const sitePattern = /site\s+(\d+|[a-z0-9]+)/i;
  const siteMatch = query.match(sitePattern);
  
  // Remove site number from query for centre matching
  const centreQuery = siteMatch ? query.replace(sitePattern, "").trim() : query;
  
  // Get all centres
  const allCentres = await db.select().from(shoppingCentres);
  
  // Filter using fuzzy matching
  const matchedCentres = allCentres.filter(centre => {
    return (
      fuzzyMatch(centreQuery, centre.name || '', 2) ||
      fuzzyMatch(centreQuery, centre.suburb || '', 2) ||
      fuzzyMatch(centreQuery, centre.city || '', 2)
    );
  });
  
  return matchedCentres;
}

export async function searchSites(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all sites with their centre information
  const allSites = await db
    .select({
      site: sites,
      centre: shoppingCentres,
    })
    .from(sites)
    .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id));

  const lowerQuery = query.toLowerCase();
  
  // Split query into words for better matching
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);

  // Search across site number, description, and centre name
  const matches = allSites.filter(({ site, centre }) => {
    const siteNumber = (site.siteNumber || "").toLowerCase();
    const description = (site.description || "").toLowerCase();
    const centreName = (centre?.name || "").toLowerCase();
    const combined = `${centreName} ${siteNumber} ${description}`.toLowerCase();

    // Check if query matches as a whole
    if (combined.includes(lowerQuery)) return true;
    
    // Check if all words in query appear somewhere in the combined text
    const allWordsMatch = queryWords.every(word => combined.includes(word));
    if (allWordsMatch) return true;
    
    // Check for substring matches in individual fields
    if (siteNumber.includes(lowerQuery) || 
        description.includes(lowerQuery) || 
        centreName.includes(lowerQuery)) {
      return true;
    }
    
    // Check fuzzy matches
    return (
      fuzzyMatch(query, siteNumber, 1) ||
      fuzzyMatch(query, description, 2) ||
      fuzzyMatch(query, centreName, 2)
    );
  });

  return matches;
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
  const insertId = Number(result[0].insertId);
  const created = await db.select().from(sites).where(eq(sites.id, insertId)).limit(1);
  return created[0];
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
  
  return await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      siteId: bookings.siteId,
      customerId: bookings.customerId,
      usageTypeId: bookings.usageTypeId,
      customUsage: bookings.customUsage,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      ownerAmount: bookings.ownerAmount,
      platformFee: bookings.platformFee,
      status: bookings.status,
      requiresApproval: bookings.requiresApproval,
      approvedBy: bookings.approvedBy,
      approvedAt: bookings.approvedAt,
      tablesRequested: bookings.tablesRequested,
      chairsRequested: bookings.chairsRequested,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      siteName: sites.description,
      centreName: shoppingCentres.name,
    })
    .from(bookings)
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));
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


// Admin helper functions
export async function getAllSites() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(sites);
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(bookings);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(users);
}


export async function deleteShoppingCentre(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // First delete all sites in this centre
  await db.delete(sites).where(eq(sites.centreId, id));
  // Then delete the centre
  return await db.delete(shoppingCentres).where(eq(shoppingCentres.id, id));
}

export async function deleteSite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(sites).where(eq(sites.id, id));
}


// Map Management
export async function uploadCentreMap(centreId: number, imageData: string, fileName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Import storage helper
  const { storagePut } = await import("./storage");
  
  // Extract base64 data (remove data:image/xxx;base64, prefix if present)
  const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Determine content type from fileName
  const ext = fileName.toLowerCase().split('.').pop();
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  
  // Generate unique file key
  const timestamp = Date.now();
  const fileKey = `centres/maps/${centreId}-${timestamp}.${ext}`;
  
  // Upload to S3
  const { url } = await storagePut(fileKey, buffer, contentType);
  
  // Update centre with map URL
  await db.update(shoppingCentres)
    .set({ mapImageUrl: url })
    .where(eq(shoppingCentres.id, centreId));
  
  return { mapUrl: url };
}

export async function saveSiteMarkers(markers: Array<{ siteId: number; x: number; y: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update each site with marker coordinates
  for (const marker of markers) {
    await db.update(sites)
      .set({
        mapMarkerX: marker.x,
        mapMarkerY: marker.y,
      })
      .where(eq(sites.id, marker.siteId));
  }
  
  return { success: true, count: markers.length };
}

export async function resetSiteMarker(siteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(sites)
    .set({
      mapMarkerX: null,
      mapMarkerY: null,
    })
    .where(eq(sites.id, siteId));
  
  return { success: true };
}

// Floor Level Management
export async function getFloorLevelsByCentre(centreId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(floorLevels)
    .where(eq(floorLevels.centreId, centreId))
    .orderBy(floorLevels.displayOrder);
}

export async function createFloorLevel(data: InsertFloorLevel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(floorLevels).values(data);
  return result;
}

export async function deleteFloorLevel(floorLevelId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if floor has any sites assigned
  const sitesOnFloor = await db
    .select()
    .from(sites)
    .where(eq(sites.floorLevelId, floorLevelId));
  
  if (sitesOnFloor.length > 0) {
    throw new Error(`Cannot delete floor level with ${sitesOnFloor.length} sites assigned. Please reassign or delete sites first.`);
  }
  
  // Delete the floor level
  await db.delete(floorLevels).where(eq(floorLevels.id, floorLevelId));
  return { success: true };
}

export async function uploadFloorLevelMap(floorLevelId: number, imageData: string, fileName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Import storage helper
  const { storagePut } = await import("./storage");
  
  // Extract base64 data
  const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Determine content type
  const ext = fileName.toLowerCase().split('.').pop();
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  
  // Generate unique file key
  const timestamp = Date.now();
  const fileKey = `centres/floor-maps/${floorLevelId}-${timestamp}.${ext}`;
  
  // Upload to S3
  const { url } = await storagePut(fileKey, buffer, contentType);
  
  // Update floor level with map URL
  await db.update(floorLevels)
    .set({ mapImageUrl: url })
    .where(eq(floorLevels.id, floorLevelId));
  
  return { mapUrl: url };
}

export async function getSitesByFloorLevel(floorLevelId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(sites)
    .where(eq(sites.floorLevelId, floorLevelId));
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

export async function getCentreByName(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db.select()
    .from(shoppingCentres)
    .where(eq(shoppingCentres.name, name))
    .limit(1);
  
  return results[0] || null;
}

export async function updateCentreCoordinates(
  centreId: number,
  latitude: string,
  longitude: string,
  address?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {
    latitude,
    longitude,
  };
  
  if (address) {
    updateData.address = address;
  }
  
  await db.update(shoppingCentres)
    .set(updateData)
    .where(eq(shoppingCentres.id, centreId));
  
  return { success: true };
}

export async function createCentre(data: {
  ownerId: number;
  name: string;
  address?: string | null;
  state?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  includeInMainSite?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(shoppingCentres).values({
    ownerId: data.ownerId,
    name: data.name,
    address: data.address || null,
    state: data.state || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    includeInMainSite: data.includeInMainSite ?? true,
  });
  
  return { success: true };
}

export async function getNearbyCentres(centreId: number, radiusKm: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Import geo utils
  const { findNearbyCentres } = await import("./geoUtils");
  
  // Get all centres with coordinates
  const allCentres = await db.select({
    id: shoppingCentres.id,
    name: shoppingCentres.name,
    latitude: shoppingCentres.latitude,
    longitude: shoppingCentres.longitude,
    address: shoppingCentres.address,
    state: shoppingCentres.state,
  }).from(shoppingCentres);
  
  // Find nearby centres
  const nearby = findNearbyCentres(allCentres, centreId, radiusKm);
  
  return nearby;
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
      customUsage: bookings.customUsage,
      tablesRequested: bookings.tablesRequested,
      chairsRequested: bookings.chairsRequested,
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

export async function approveBooking(bookingId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(bookings)
    .set({
      status: "confirmed",
      approvedBy,
      approvedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));
}

export async function rejectBooking(bookingId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(bookings)
    .set({
      status: "rejected",
      rejectionReason: reason || null,
    })
    .where(eq(bookings.id, bookingId));
}


export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function getUsageTypeById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(usageTypes)
    .where(eq(usageTypes.id, id))
    .limit(1);
  
  return result[0] || null;
}
