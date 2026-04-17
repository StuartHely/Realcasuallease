import { eq, desc, and, or, isNull, lte, gte, inArray } from "drizzle-orm";
import { expandCategoryKeyword } from "../shared/categorySynonyms.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { 
  InsertUser, users, 
  customerProfiles, InsertCustomerProfile,
  owners, InsertOwner,
  portfolios,
  floorLevels, InsertFloorLevel,
  shoppingCentres, InsertShoppingCentre,
  sites, InsertSite,
  usageTypes, InsertUsageType,
  usageCategories,
  siteUsageCategories,
  bookings, InsertBooking,
  bookingStatusHistory,
  transactions, InsertTransaction,
  systemConfig, InsertSystemConfig,
  auditLog, InsertAuditLog,
  budgets,
  passwordResetTokens
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureUniqueSlug(slug: string, excludeId?: number): Promise<string> {
  const database = await getDb();
  if (!database) return slug;

  let candidate = slug;
  let counter = 1;

  while (true) {
    const existing = await database
      .select({ id: shoppingCentres.id })
      .from(shoppingCentres)
      .where(eq(shoppingCentres.slug, candidate))
      .limit(1);

    if (existing.length === 0 || (excludeId !== undefined && existing[0].id === excludeId)) {
      return candidate;
    }

    counter++;
    candidate = `${slug}-${counter}`;
  }
}

/** Strip HTML tags and decode entities from rich text fields */
function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  let text = html.replace(/<[^>]*>/g, "");
  // Decode named entities
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Decode numeric entities (&#NNN; and &#xHHH;)
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return text.trim();
}

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
    if (user.loginMethod !== undefined) {
      values.loginMethod = user.loginMethod;
      updateSet.loginMethod = user.loginMethod;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.openId, set: updateSet });
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

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user || null;
}

export async function createUserWithPassword(userData: {
  openId: string;
  username: string;
  passwordHash: string;
  name?: string | null;
  email?: string | null;
  role?: "customer" | "owner_viewer" | "owner_centre_manager" | "owner_marketing_manager" | "owner_regional_admin" | "owner_state_admin" | "owner_super_admin" | "mega_state_admin" | "mega_admin";
  loginMethod?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(users).values({
    openId: userData.openId,
    username: userData.username,
    passwordHash: userData.passwordHash,
    name: userData.name || null,
    email: userData.email || null,
    role: userData.role || "customer",
    loginMethod: userData.loginMethod || "password",
  });
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
  
  // Map users with their profiles - nest profile data in a profile object
  return allUsers.map(user => {
    const profile = profileMap.get(user.id);
    return {
      ...user,
      // Keep flat properties for backward compatibility
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
      insurancePolicyNo: profile?.insurancePolicyNo || null,
      insuranceAmount: profile?.insuranceAmount || null,
      insuranceExpiry: profile?.insuranceExpiry || null,
      insuranceDocumentUrl: profile?.insuranceDocumentUrl || null,
      // Also include nested profile object for Edit User dialog
      profile: profile ? {
        companyName: profile.companyName,
        tradingName: profile.tradingName,
        website: profile.website,
        abn: profile.abn,
        streetAddress: profile.streetAddress,
        city: profile.city,
        state: profile.state,
        postcode: profile.postcode,
        productCategory: profile.productCategory,
        productDetails: profile.productDetails,
        insuranceCompany: profile.insuranceCompany,
        insurancePolicyNo: profile.insurancePolicyNo,
        insuranceAmount: profile.insuranceAmount,
        insuranceExpiry: profile.insuranceExpiry,
        insuranceDocumentUrl: profile.insuranceDocumentUrl,
      } : null,
    };
  });
}

export async function getAllSites() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(sites).orderBy(desc(sites.createdAt));
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

export async function getCustomerProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId));
  return profile || null;
}

export async function createCustomerProfile(profile: Omit<InsertCustomerProfile, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Explicitly exclude id to let the database auto-generate it
  const { ...profileWithoutId } = profile as any;
  delete profileWithoutId.id;
  
  return await db.insert(customerProfiles).values(profileWithoutId);
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

export async function updateOwner(id: number, data: Partial<InsertOwner>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(owners).set(data).where(eq(owners.id, id));
}

export async function deleteOwner(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(owners).where(eq(owners.id, id));
}

export async function getShoppingCentres(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  const query = db.select().from(shoppingCentres);
  if (ownerId != null) {
    return await query.where(eq(shoppingCentres.ownerId, ownerId)).orderBy(shoppingCentres.name);
  }
  return await query.orderBy(shoppingCentres.name);
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


export async function getShoppingCentresByState(state: string, ownerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const condition = ownerId != null
    ? and(eq(shoppingCentres.state, state), eq(shoppingCentres.ownerId, ownerId))
    : eq(shoppingCentres.state, state);
  return await db.select().from(shoppingCentres).where(condition);
}

export async function getNearbyCentres(centreId: number, radiusKm: number = 10, ownerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Import geo utils
  const { findNearbyCentres } = await import("./geoUtils");
  
  // Get all centres with coordinates
  const query = db.select({
    id: shoppingCentres.id,
    name: shoppingCentres.name,
    slug: shoppingCentres.slug,
    latitude: shoppingCentres.latitude,
    longitude: shoppingCentres.longitude,
    address: shoppingCentres.address,
    state: shoppingCentres.state,
  }).from(shoppingCentres);
  const allCentres = ownerId != null
    ? await query.where(eq(shoppingCentres.ownerId, ownerId))
    : await query;
  
  // Find nearby centres
  const nearby = findNearbyCentres(allCentres, centreId, radiusKm);
  
  return nearby;
}

export async function getShoppingCentreBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  
  const centres = await db
    .select()
    .from(shoppingCentres)
    .where(eq(shoppingCentres.slug, slug))
    .limit(1);
  
  if (!centres[0]) return null;
  
  // Get the first floor level's map image URL if it exists
  const [firstFloor] = await db
    .select({ mapImageUrl: floorLevels.mapImageUrl })
    .from(floorLevels)
    .where(eq(floorLevels.centreId, centres[0].id))
    .orderBy(floorLevels.displayOrder)
    .limit(1);
  
  return {
    ...centres[0],
    mapImageUrl: firstFloor?.mapImageUrl || centres[0].mapImageUrl,
  };
}

export async function getShoppingCentreByIdOrSlug(idOrSlug: string | number) {
  const db = await getDb();
  if (!db) return null;
  
  // Try parsing as number first
  const id = typeof idOrSlug === 'number' ? idOrSlug : parseInt(idOrSlug);
  
  if (!isNaN(id)) {
    // It's a number, use ID lookup
    return await getShoppingCentreById(id);
  }
  
  // It's a slug, use slug lookup
  return await getShoppingCentreBySlug(idOrSlug as string);

}

export async function searchShoppingCentres(query: string, stateFilter?: string, ownerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Parse query for site-specific patterns (e.g., "Pacific Square Site 2")
  const sitePattern = /site\s+(\d+|[a-z0-9]+)/i;
  const siteMatch = query.match(sitePattern);
  
  // Remove site number from query for centre matching
  const centreQuery = siteMatch ? query.replace(sitePattern, "").trim() : query;
  
  // Get all centres, optionally filtered by state and/or owner
  let allCentres;
  if (stateFilter && ownerId != null) {
    allCentres = await db.select().from(shoppingCentres).where(and(eq(shoppingCentres.state, stateFilter), eq(shoppingCentres.ownerId, ownerId)));
  } else if (stateFilter) {
    allCentres = await db.select().from(shoppingCentres).where(eq(shoppingCentres.state, stateFilter));
  } else if (ownerId != null) {
    allCentres = await db.select().from(shoppingCentres).where(eq(shoppingCentres.ownerId, ownerId));
  } else {
    allCentres = await db.select().from(shoppingCentres);
  }
  
  if (!centreQuery.trim()) {
    const filtered = allCentres.filter(centre => centre.includeInMainSite);
    return await enrichCentresWithFloorLevelMaps(db, filtered);
  }
  const { fuzzySearchCentres } = await import('./fuzzySearch');
  const searchableCentres = allCentres.filter(c => c.includeInMainSite).map(c => ({ id: c.id, name: c.name, suburb: c.suburb?.trim() ?? null, state: c.state }));
  const fuzzyResults = await fuzzySearchCentres(centreQuery, searchableCentres);
  const centreMap = new Map(allCentres.map(c => [c.id, c]));
  const scoredCentres = fuzzyResults.map(r => ({ centre: centreMap.get(r.id)!, score: r.score })).filter(i => i.centre);
  const results = scoredCentres.length > 0 && scoredCentres[0].score >= 0.8
    ? [scoredCentres[0].centre]
    : scoredCentres.map(i => i.centre);
  return await enrichCentresWithFloorLevelMaps(db, results);
}

async function enrichCentresWithFloorLevelMaps(db: any, centres: any[]) {
  if (centres.length === 0) return centres;
  const centreIds = centres.map(c => c.id);
  const floors = await db
    .select({ centreId: floorLevels.centreId, mapImageUrl: floorLevels.mapImageUrl })
    .from(floorLevels)
    .where(and(inArray(floorLevels.centreId, centreIds), eq(floorLevels.isHidden, false)))
    .orderBy(floorLevels.displayOrder);
  const floorMap = new Map<number, string>();
  for (const f of floors) {
    if (f.mapImageUrl && !floorMap.has(f.centreId)) {
      floorMap.set(f.centreId, f.mapImageUrl);
    }
  }
  return centres.map(c => ({
    ...c,
    mapImageUrl: floorMap.get(c.id) || c.mapImageUrl,
  }));
}

export async function uploadCentreMap(centreId: number, imageData: string, fileName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = fileName.toLowerCase().split('.').pop() || 'png';
  const timestamp = Date.now();
  const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

  const { storagePut } = await import('./storage');
  const { url } = await storagePut(`maps/centres/${centreId}-${timestamp}.${ext}`, buffer, contentType);
  
  // Update centre with map URL
  await db.update(shoppingCentres)
    .set({ mapImageUrl: url })
    .where(eq(shoppingCentres.id, centreId));
  
  return { url, success: true };
}

export async function createShoppingCentre(centre: InsertShoppingCentre) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!centre.slug && centre.name) {
    centre.slug = await ensureUniqueSlug(generateSlug(centre.name));
  }

  const [row] = await db.insert(shoppingCentres).values(centre).returning({ id: shoppingCentres.id });
  return row;
}

export async function updateShoppingCentre(id: number, updates: Partial<InsertShoppingCentre>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (updates.name) {
    updates.slug = await ensureUniqueSlug(generateSlug(updates.name), id);
  }

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

export async function searchSitesWithCategory(query: string, categoryKeyword?: string, stateFilter?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Import fuzzy matching utility
  const { fuzzyMatchCategory } = await import("../shared/stringSimilarity.js");
  
  // Simple substring matching helper
  const fuzzyMatch = (query: string, target: string, threshold: number) => {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    // Only check if target contains query (not the reverse)
    return t.includes(q);
  };
  
  // Get all sites with their centre information and approved categories
  // Filter out sites from test centres (where includeInMainSite = 0)
  // Optionally filter by state
  const baseCondition = eq(shoppingCentres.includeInMainSite, true);
  const stateCondition = stateFilter ? and(baseCondition, eq(shoppingCentres.state, stateFilter)) : baseCondition;
  
  const allSites = await db
    .select({
      site: sites,
      centre: shoppingCentres,
      categoryId: siteUsageCategories.categoryId,
      category: usageCategories,
    })
    .from(sites)
    .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .leftJoin(siteUsageCategories, eq(sites.id, siteUsageCategories.siteId))
    .leftJoin(usageCategories, eq(siteUsageCategories.categoryId, usageCategories.id))
    .where(stateCondition);
  
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  // Extract site number from "site X" pattern (e.g., "site 2", "site 10")
  const siteNumberMatch = lowerQuery.match(/site\s*(\d+)/i);
  const targetSiteNumber = siteNumberMatch ? siteNumberMatch[1] : null;
  
  // Remove "site" word from query words if we found a site number pattern
  // This prevents "site" from being required to match in the combined text
  const filteredQueryWords = targetSiteNumber 
    ? queryWords.filter(w => w !== 'site')
    : queryWords;
  
  // Group sites by site ID to consolidate multiple category matches
  const siteMap = new Map<number, { site: typeof sites.$inferSelect; centre: typeof shoppingCentres.$inferSelect | null; categories: Array<typeof usageCategories.$inferSelect> }>();
  
  for (const row of allSites) {
    const siteId = row.site.id;
    if (!siteMap.has(siteId)) {
      siteMap.set(siteId, {
        site: row.site,
        centre: row.centre,
        categories: [],
      });
    }
    if (row.category) {
      siteMap.get(siteId)!.categories.push(row.category);
    }
  }
  
  // Filter sites based on query and category
  const matches = Array.from(siteMap.values()).filter(({ site, centre, categories }) => {
    const siteNumber = (site.siteNumber || "").toLowerCase();
    const description = (site.description || "").toLowerCase();
    const centreName = (centre?.name || "").toLowerCase();
    const categoryNames = categories.map(c => c.name.toLowerCase()).join(" ");
    const combined = `${centreName} ${siteNumber} ${description} ${categoryNames}`.toLowerCase();
    
    // If category keyword is provided, ONLY match sites that have this as an approved category.
    // Do NOT fall through to description/name matching — otherwise a site named
    // "Next to Shoes Shop" would match a "shoes" search even if shoes isn't approved.
    if (categoryKeyword) {
      const categoryMatch = categories.some(cat => 
        fuzzyMatchCategory(categoryKeyword, cat.name, 0.6)
      );
      return categoryMatch;
    }
    
    // If searching for a specific site number, check if this site matches
    if (targetSiteNumber) {
      // Check if the site number matches exactly
      // "2" should match "2" but not "22", "L2-33", or "12"
      // Also handle formats like "2A", "2B" (site 2 with suffix)
      const siteNumMatches = siteNumber === targetSiteNumber || 
        // Match "2A", "2B" etc (number followed by letter suffix)
        new RegExp(`^${targetSiteNumber}[a-z]?$`, 'i').test(siteNumber);
      
      // Also check if the centre name matches (for queries like "Eastgate Site 2")
      const otherWordsMatch = filteredQueryWords
        .filter(w => w !== targetSiteNumber) // Remove the site number from words to check
        .every(word => combined.includes(word));
      
      if (siteNumMatches && otherWordsMatch) return true;
    }
    
    // Check if query matches as a whole (but skip if we have a site number pattern)
    if (!targetSiteNumber && combined.includes(lowerQuery)) return true;
    
    // Check if all words in query appear somewhere in the combined text
    // Skip this check if we have a site number pattern, as we already handled it above
    if (!targetSiteNumber) {
      const allWordsMatch = filteredQueryWords.every(word => combined.includes(word));
      if (allWordsMatch) return true;
    }
    
    // Check for substring matches in individual fields
    if (siteNumber.includes(lowerQuery) || 
        description.includes(lowerQuery) || 
        centreName.includes(lowerQuery) ||
        categoryNames.includes(lowerQuery)) {
      return true;
    }
    
    // Check fuzzy matches
    return (
      fuzzyMatch(query, siteNumber, 1) ||
      fuzzyMatch(query, description, 2) ||
      fuzzyMatch(query, centreName, 2) ||
      fuzzyMatch(query, categoryNames, 2)
    );
  });
  
  // Sort matches by site number using natural/alphanumeric ordering
  matches.sort((a, b) => {
    const aNum = parseInt(a.site.siteNumber.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.site.siteNumber.replace(/\D/g, '')) || 0;
    const aHasLetter = /[a-zA-Z]/.test(a.site.siteNumber);
    const bHasLetter = /[a-zA-Z]/.test(b.site.siteNumber);
    // Pure numbers come before alphanumeric
    if (!aHasLetter && bHasLetter) return -1;
    if (aHasLetter && !bHasLetter) return 1;
    // Compare by extracted number first
    if (aNum !== bNum) return aNum - bNum;
    // If same number, compare full string
    return a.site.siteNumber.localeCompare(b.site.siteNumber);
  });
  
  // Return in the same format as searchSites
  return matches.map(({ site, centre }) => ({ site, centre }));
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

  const sitesList = await db.select().from(sites).where(eq(sites.centreId, centreId));
  
  // Sort sites using natural/alphanumeric ordering (1, 2, 3, ... 10, 11, 12, ... 9a, VK13)
  sitesList.sort((a, b) => {
    const aNum = parseInt(a.siteNumber.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.siteNumber.replace(/\D/g, '')) || 0;
    const aHasLetter = /[a-zA-Z]/.test(a.siteNumber);
    const bHasLetter = /[a-zA-Z]/.test(b.siteNumber);
    // Pure numbers come before alphanumeric
    if (!aHasLetter && bHasLetter) return -1;
    if (aHasLetter && !bHasLetter) return 1;
    // Compare by extracted number first
    if (aNum !== bNum) return aNum - bNum;
    // If same number, compare full string
    return a.siteNumber.localeCompare(b.siteNumber);
  });
  
  return sitesList;
}

export async function createSite(site: InsertSite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(sites).values(site).returning();
  return result;
}

export async function updateSite(id: number, updates: Partial<InsertSite>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Clean up the updates object - remove undefined values
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }
  
  if (Object.keys(cleanUpdates).length === 0) {
    return { rowsAffected: 0 };
  }

  try {
    const result = await db.update(sites).set(cleanUpdates).where(eq(sites.id, id));
    return result;
  } catch (error: any) {
    console.error("[updateSite] Failed:", { siteId: id, cleanUpdates, error: error.message });
    throw new Error(`Failed to update site: ${error.message}`);
  }
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

  try {
    return await db.insert(bookings).values(booking).returning({ id: bookings.id });
  } catch (err: any) {
    // Extract the real PostgreSQL error from Drizzle's wrapper
    const pgError = err?.cause?.message || err?.message || String(err);
    console.error(`[createBooking] INSERT failed. PG error: ${pgError}`);

    // If a column doesn't exist, auto-fix and retry
    if (pgError.includes('does not exist') || pgError.includes('column')) {
      console.error(`[createBooking] Attempting to add missing columns and retry...`);
      try {
        const fixes = [
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignatureToken" varchar(64)`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedAt" timestamp`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByName" varchar(255)`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByIp" varchar(45)`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refundPendingAt" timestamp`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "invoiceDispatchedAt" timestamp`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "recurrenceGroupId" varchar(50)`,
          `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refundStatus" varchar(50)`,
        ];
        for (const sql of fixes) {
          await db.execute(sql).catch(() => {});
        }
        console.log(`[createBooking] Column fixes applied, retrying...`);
        return await db.insert(bookings).values(booking).returning({ id: bookings.id });
      } catch (retryErr: any) {
        const retryPgError = retryErr?.cause?.message || retryErr?.message || String(retryErr);
        console.error(`[createBooking] Retry failed: ${retryPgError}`);
        throw new Error(`Booking insert failed: ${retryPgError}`);
      }
    }
    // Provide a cleaner error message instead of raw SQL
    throw new Error(`Booking insert failed: ${pgError}`);
  }
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
  return booking || null;
}

export async function getBookingsBySiteId(siteId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [
    eq(bookings.siteId, siteId),
    // Only consider active bookings — cancelled/rejected should not block availability
    or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
  ];
  
  if (startDate && endDate) {
    // Find bookings that overlap with the requested date range
    conditions.push(
      or(
        and(
          lte(bookings.startDate, endDate),
          gte(bookings.endDate, startDate)
        )
      )!
    );
  }

  return await db.select().from(bookings).where(and(...conditions));
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
      paymentMethod: bookings.paymentMethod,
      paidAt: bookings.paidAt,
      cancelledAt: bookings.cancelledAt,
      rejectionReason: bookings.rejectionReason,
      recurrenceGroupId: bookings.recurrenceGroupId,
    })
    .from(bookings)
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));

  return bookingsList.map(b => ({ ...b, siteName: stripHtml(b.siteName) }));
}

// Booking management
export async function getBookingsByStatus(status?: "pending" | "confirmed" | "cancelled" | "completed" | "rejected") {
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
      companyName: customerProfiles.companyName,
      tradingName: customerProfiles.tradingName,
      siteName: sites.description,
      siteNumber: sites.siteNumber,
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
      updatedAt: bookings.updatedAt,
      centreId: shoppingCentres.id,
      licenceSignedAt: bookings.licenceSignedAt,
      licenceSignatureToken: bookings.licenceSignatureToken,
      rejectionReason: bookings.rejectionReason,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .leftJoin(customerProfiles, eq(users.id, customerProfiles.userId))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .orderBy(desc(bookings.createdAt));

  const rows = status ? await query.where(eq(bookings.status, status)) : await query;

  // Resolve usage category names (separate query to avoid column name conflicts with joins)
  const categoryIds = Array.from(new Set(rows.map(r => r.usageCategoryId).filter((id): id is number => id != null)));
  const categoryMap = new Map<number, string>();
  if (categoryIds.length > 0) {
    const cats = await db.select({ id: usageCategories.id, name: usageCategories.name }).from(usageCategories).where(inArray(usageCategories.id, categoryIds));
    for (const c of cats) categoryMap.set(c.id, c.name);
  }

  return rows.map(r => ({
    ...r,
    siteName: stripHtml(r.siteName),
    productCategory: (r.usageCategoryId ? categoryMap.get(r.usageCategoryId) : null) || null,
  }));
}

// Get unpaid invoice bookings (regardless of status)
export async function getUnpaidInvoiceBookings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const rows = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      siteId: bookings.siteId,
      customerId: bookings.customerId,
      customerName: users.name,
      customerEmail: users.email,
      companyName: customerProfiles.companyName,
      tradingName: customerProfiles.tradingName,
      siteName: sites.description,
      siteNumber: sites.siteNumber,
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
      updatedAt: bookings.updatedAt,
      centreId: shoppingCentres.id,
      licenceSignedAt: bookings.licenceSignedAt,
      licenceSignatureToken: bookings.licenceSignatureToken,
      rejectionReason: bookings.rejectionReason,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .leftJoin(customerProfiles, eq(users.id, customerProfiles.userId))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(
      and(
        eq(bookings.paymentMethod, "invoice"),
        isNull(bookings.paidAt)
      )
    )
    .orderBy(desc(bookings.createdAt));

  // Resolve usage category names
  const categoryIds = Array.from(new Set(rows.map(r => r.usageCategoryId).filter((id): id is number => id != null)));
  const categoryMap = new Map<number, string>();
  if (categoryIds.length > 0) {
    const cats = await db.select({ id: usageCategories.id, name: usageCategories.name }).from(usageCategories).where(inArray(usageCategories.id, categoryIds));
    for (const c of cats) categoryMap.set(c.id, c.name);
  }

  return rows.map(r => ({
    ...r,
    siteName: stripHtml(r.siteName),
    productCategory: (r.usageCategoryId ? categoryMap.get(r.usageCategoryId) : null) || null,
  }));
}

export async function approveBooking(bookingId: number, approvedBy: number, approvedByName?: string) {
  const { changeBookingStatus } = await import("./bookingStatusHelper");
  await changeBookingStatus({
    bookingId,
    newStatus: "confirmed",
    changedBy: approvedBy,
    changedByName: approvedByName,
    reason: "Booking approved",
    additionalUpdates: {
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

export async function rejectBooking(bookingId: number, reason: string, rejectedBy?: number, rejectedByName?: string) {
  const { changeBookingStatus } = await import("./bookingStatusHelper");
  await changeBookingStatus({
    bookingId,
    newStatus: "rejected",
    changedBy: rejectedBy,
    changedByName: rejectedByName,
    reason,
    additionalUpdates: {
      rejectionReason: reason,
    },
  });
}

export async function updateBookingStatus(
  bookingId: number, 
  status: "pending" | "confirmed" | "cancelled" | "completed" | "rejected",
  changedBy?: number,
  changedByName?: string,
  reason?: string
) {
  const { changeBookingStatus } = await import("./bookingStatusHelper");
  await changeBookingStatus({
    bookingId,
    newStatus: status,
    changedBy,
    changedByName,
    reason,
  });
}

export async function updateUser(userId: number, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(users).set(updates).where(eq(users.id, userId));
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

  return await db.select().from(auditLog).orderBy(desc(auditLog.createdAt));
}

// Floor Levels
export async function getFloorLevelsByCentreId(centreId: number, includeHidden: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(floorLevels.centreId, centreId)];
  if (!includeHidden) {
    conditions.push(eq(floorLevels.isHidden, false));
  }

  return await db
    .select()
    .from(floorLevels)
    .where(and(...conditions))
    .orderBy(floorLevels.levelName); // Sort alphabetically by floor name
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

  const [result] = await db.insert(floorLevels).values(level).returning({ id: floorLevels.id });
  return result;
}

export async function migrateCentreMapToFloorLevel(centreId: number): Promise<{ floorLevelId: number; mapUrl: string } | null> {
  const db = await getDb();
  if (!db) return null;

  // Check centre has a map but no floor levels
  const [centre] = await db.select({ mapImageUrl: shoppingCentres.mapImageUrl })
    .from(shoppingCentres).where(eq(shoppingCentres.id, centreId));
  if (!centre?.mapImageUrl) return null;

  const existing = await db.select({ id: floorLevels.id })
    .from(floorLevels).where(eq(floorLevels.centreId, centreId));
  if (existing.length > 0) return null;

  // Create "Ground Floor" and move the map URL to it
  const [newFloor] = await db.insert(floorLevels).values({
    centreId,
    levelName: "Ground Floor",
    levelNumber: "1",
    displayOrder: 0,
    mapImageUrl: centre.mapImageUrl,
    isHidden: false,
  }).returning({ id: floorLevels.id });

  // Clear centre-level map (now on the floor level)
  await db.update(shoppingCentres)
    .set({ mapImageUrl: null })
    .where(eq(shoppingCentres.id, centreId));

  return { floorLevelId: newFloor.id, mapUrl: centre.mapImageUrl };
}

export async function migrateAllCentreMapsToFloorLevels(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Find all centres with a centre-level map but no floor levels
  const allCentres = await db.select({ id: shoppingCentres.id, name: shoppingCentres.name, mapImageUrl: shoppingCentres.mapImageUrl })
    .from(shoppingCentres);

  let migrated = 0;
  for (const centre of allCentres) {
    if (!centre.mapImageUrl) continue;
    const existing = await db.select({ id: floorLevels.id })
      .from(floorLevels).where(eq(floorLevels.centreId, centre.id));
    if (existing.length > 0) continue;

    await db.insert(floorLevels).values({
      centreId: centre.id,
      levelName: "Ground Floor",
      levelNumber: "1",
      displayOrder: 0,
      mapImageUrl: centre.mapImageUrl,
      isHidden: false,
    });

    await db.update(shoppingCentres)
      .set({ mapImageUrl: null })
      .where(eq(shoppingCentres.id, centre.id));

    console.log(`[MapMigration] Migrated "${centre.name}" (id=${centre.id}) map to Ground Floor`);
    migrated++;
  }
  return migrated;
}

export async function updateFloorLevel(id: number, updates: Partial<InsertFloorLevel>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(floorLevels).set(updates).where(eq(floorLevels.id, id));
}

export async function deleteFloorLevel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Clear map markers on sites assigned to this floor — their coordinates
  // were positioned relative to this floor's map image which is being deleted.
  await db.update(sites)
    .set({ mapMarkerX: null, mapMarkerY: null })
    .where(eq(sites.floorLevelId, id));

  return await db.delete(floorLevels).where(eq(floorLevels.id, id));
}

export async function hideFloorLevel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(floorLevels)
    .set({ isHidden: true })
    .where(eq(floorLevels.id, id));
}

export async function unhideFloorLevel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(floorLevels)
    .set({ isHidden: false })
    .where(eq(floorLevels.id, id));
}

export async function getFloorLevelsByCentre(centreId: number, includeHidden: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(floorLevels.centreId, centreId)];
  if (!includeHidden) {
    conditions.push(eq(floorLevels.isHidden, false));
  }
  
  return await db.select()
    .from(floorLevels)
    .where(and(...conditions))
    .orderBy(floorLevels.levelName); // Sort alphabetically by floor name
}

export async function uploadFloorLevelMap(floorLevelId: number, imageData: string, fileName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = fileName.toLowerCase().split('.').pop() || 'png';
  const timestamp = Date.now();
  const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

  const { storagePut } = await import('./storage');
  const { url } = await storagePut(`maps/floor-levels/${floorLevelId}-${timestamp}.${ext}`, buffer, contentType);
  
  // Update floor level with new map URL
  await db.update(floorLevels)
    .set({ mapImageUrl: url })
    .where(eq(floorLevels.id, floorLevelId));
  
  return { url, success: true };
}

export async function getSitesByFloorLevel(floorLevelId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(sites)
    .where(eq(sites.floorLevelId, floorLevelId));
}

export async function saveSiteMarkers(markers: Array<{ siteId: number; x: number; y: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update each site with marker coordinates
  for (const marker of markers) {
    await db.update(sites)
      .set({
        mapMarkerX: String(marker.x),
        mapMarkerY: String(marker.y),
      })
      .where(eq(sites.id, marker.siteId));
  }
  
  return { success: true, count: markers.length };
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
  
  // Send payment receipt email to customer (fire-and-forget)
  const paidAt = new Date();
  try {
    const customer = await getUserById(booking.customerId);
    const customerProfile = customer ? await getCustomerProfileByUserId(customer.id) : null;
    
    if (customer && customer.email) {
      const { sendPaymentReceiptEmail } = await import('./_core/bookingNotifications');
      await sendPaymentReceiptEmail({
        bookingNumber: booking.bookingNumber,
        customerName: customer.name || 'Customer',
        customerEmail: customer.email,
        centreName: centre.name,
        siteNumber: site.siteNumber,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: booking.totalAmount,
        companyName: customerProfile?.companyName || undefined,
        tradingName: customerProfile?.tradingName || undefined,
        paidAt,
        ownerId: centre.ownerId,
      });
    }

    // Send payment notification to owner (fire-and-forget)
    if (centre.ownerId) {
      const owner = await getOwnerById(centre.ownerId);
      if (owner && owner.email) {
        const { sendOwnerPaymentNotificationEmail } = await import('./_core/bookingNotifications');
        sendOwnerPaymentNotificationEmail({
          ownerEmail: owner.email,
          ownerName: owner.name || 'Owner',
          bookingNumber: booking.bookingNumber,
          customerName: customer?.name || 'Customer',
          centreName: centre.name,
          siteNumber: site.siteNumber,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalAmount: booking.totalAmount,
          ownerAmount: booking.ownerAmount,
          platformFee: booking.platformFee,
          ownerId: centre.ownerId,
          paidAt,
        }).catch((err: any) => console.error('[recordPayment] Owner notification failed:', err));
      }
    }
  } catch (emailError) {
    console.error('[recordPayment] Failed to send receipt email:', emailError);
    // Don't fail the payment recording if email fails
  }
  
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


// ==================== Budget Management ====================

export async function getAllBudgets() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: budgets.id,
      siteId: budgets.siteId,
      siteName: sites.siteNumber,
      centreName: shoppingCentres.name,
      month: budgets.month,
      year: budgets.year,
      budgetAmount: budgets.budgetAmount,
      createdAt: budgets.createdAt,
    })
    .from(budgets)
    .leftJoin(sites, eq(budgets.siteId, sites.id))
    .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .orderBy(desc(budgets.year), desc(budgets.month));
  
  return result;
}

export async function createBudget(input: { siteId: number; month: number; year: number; budgetAmount: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if budget already exists for this site/month/year
  const existing = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.siteId, input.siteId),
        eq(budgets.month, input.month),
        eq(budgets.year, input.year)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error("Budget already exists for this site, month, and year");
  }
  
  await db.insert(budgets).values({
    siteId: input.siteId,
    month: input.month,
    year: input.year,
    budgetAmount: input.budgetAmount,
  });
  
  return { success: true };
}

export async function updateBudget(id: number, budgetAmount: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(budgets)
    .set({ budgetAmount })
    .where(eq(budgets.id, id));
  
  return { success: true };
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(budgets).where(eq(budgets.id, id));
  
  return { success: true };
}

export async function getBudgetsBySite(siteId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.siteId, siteId),
        eq(budgets.year, year)
      )
    )
    .orderBy(budgets.month);
}


/**
 * Bulk import budgets from CSV data
 */
export async function bulkImportBudgets(budgetData: Array<{
  siteId: number;
  month: number;
  year: number;
  budgetAmount: string;
}>): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, imported: 0, skipped: 0, errors: [{ row: 0, error: 'Database connection failed' }] };
  }

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < budgetData.length; i++) {
    const record = budgetData[i];
    const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

    try {
      // Validate data
      if (!record.siteId || !record.month || !record.year || !record.budgetAmount) {
        errors.push({ row: rowNum, error: 'Missing required fields' });
        skipped++;
        continue;
      }

      if (record.month < 1 || record.month > 12) {
        errors.push({ row: rowNum, error: 'Month must be between 1 and 12' });
        skipped++;
        continue;
      }

      // Check if budget already exists
      const existing = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.siteId, record.siteId),
            eq(budgets.month, record.month),
            eq(budgets.year, record.year)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing budget
        await db
          .update(budgets)
          .set({ budgetAmount: record.budgetAmount })
          .where(eq(budgets.id, existing[0].id));
        imported++;
      } else {
        // Insert new budget
        await db.insert(budgets).values({
          siteId: record.siteId,
          month: record.month,
          year: record.year,
          budgetAmount: record.budgetAmount,
        });
        imported++;
      }
    } catch (error: any) {
      errors.push({ row: rowNum, error: error.message || 'Unknown error' });
      skipped++;
    }
  }

  return {
    success: errors.length === 0,
    imported,
    skipped,
    errors,
  };
}

/**
 * Get booking status history for audit trail
 */
export async function getBookingStatusHistory(bookingId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: bookingStatusHistory.id,
      bookingId: bookingStatusHistory.bookingId,
      previousStatus: bookingStatusHistory.previousStatus,
      newStatus: bookingStatusHistory.newStatus,
      changedBy: bookingStatusHistory.changedBy,
      changedByName: bookingStatusHistory.changedByName,
      reason: bookingStatusHistory.reason,
      createdAt: bookingStatusHistory.createdAt,
    })
    .from(bookingStatusHistory)
    .where(eq(bookingStatusHistory.bookingId, bookingId))
    .orderBy(desc(bookingStatusHistory.createdAt));
}

/**
 * Record initial booking creation in status history.
 * Delegates to the centralized bookingStatusHelper.
 */
export async function recordBookingCreated(bookingId: number, status: "pending" | "confirmed", createdBy?: number, createdByName?: string) {
  const { recordBookingCreated: record } = await import("./bookingStatusHelper");
  await record(bookingId, status, createdBy, createdByName);
}

// =============================================================================
// Password Reset Tokens
// =============================================================================

export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getValidPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      token: passwordResetTokens.token,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
      email: users.email,
      username: users.username,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return row || null;
}

export async function markPasswordResetTokenUsed(tokenId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
}

export async function updateUserPasswordHash(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

/**
 * Find centre contact details by partial name match (for Aria AI assistant)
 */
export async function findCentreContact(searchTerm: string) {
  const db = await getDb();
  if (!db) return [];

  const { ilike } = await import("drizzle-orm");
  const results = await db.select({
    name: shoppingCentres.name,
    contactName: shoppingCentres.contactName,
    contactEmail: shoppingCentres.contactEmail,
    contactPhone: shoppingCentres.contactPhone,
    address: shoppingCentres.address,
    state: shoppingCentres.state,
  })
  .from(shoppingCentres)
  .where(ilike(shoppingCentres.name, `%${searchTerm}%`))
  .limit(5);

  return results;
}

/**
 * Resolve bank account details for remittance.
 * Priority: centre-level → portfolio-level → owner-level.
 * Returns the most specific non-null bank account, or null if none exists.
 */
export async function resolveRemittanceBankAccount(centreId: number): Promise<{
  bankBsb: string;
  bankAccountNumber: string;
  bankAccountName: string;
  resolvedFrom: "centre" | "portfolio" | "owner";
} | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [centre] = await db
    .select({
      bankBsb: shoppingCentres.bankBsb,
      bankAccountNumber: shoppingCentres.bankAccountNumber,
      bankAccountName: shoppingCentres.bankAccountName,
      portfolioId: shoppingCentres.portfolioId,
      ownerId: shoppingCentres.ownerId,
    })
    .from(shoppingCentres)
    .where(eq(shoppingCentres.id, centreId));

  if (!centre) return null;

  // Check centre-level override
  if (centre.bankBsb && centre.bankAccountNumber && centre.bankAccountName) {
    return {
      bankBsb: centre.bankBsb,
      bankAccountNumber: centre.bankAccountNumber,
      bankAccountName: centre.bankAccountName,
      resolvedFrom: "centre",
    };
  }

  // Check portfolio-level
  if (centre.portfolioId) {
    const [portfolio] = await db
      .select({
        bankBsb: portfolios.bankBsb,
        bankAccountNumber: portfolios.bankAccountNumber,
        bankAccountName: portfolios.bankAccountName,
      })
      .from(portfolios)
      .where(eq(portfolios.id, centre.portfolioId));

    if (portfolio?.bankBsb && portfolio?.bankAccountNumber && portfolio?.bankAccountName) {
      return {
        bankBsb: portfolio.bankBsb,
        bankAccountNumber: portfolio.bankAccountNumber,
        bankAccountName: portfolio.bankAccountName,
        resolvedFrom: "portfolio",
      };
    }
  }

  // Fall back to owner-level
  const [owner] = await db
    .select({
      bankBsb: owners.bankBsb,
      bankAccountNumber: owners.bankAccountNumber,
      bankAccountName: owners.bankAccountName,
    })
    .from(owners)
    .where(eq(owners.id, centre.ownerId));

  if (owner?.bankBsb && owner?.bankAccountNumber && owner?.bankAccountName) {
    return {
      bankBsb: owner.bankBsb,
      bankAccountNumber: owner.bankAccountNumber,
      bankAccountName: owner.bankAccountName,
      resolvedFrom: "owner",
    };
  }

  return null;
}

export async function getBookingStatusCounts(ownerId?: number) {
  const db = await getDb();
  if (!db) return { all: 0, pending: 0, confirmed: 0, cancelled: 0, rejected: 0, completed: 0, unpaid: 0, totalOutstanding: 0, totalOverdue: 0, outstandingCount: 0, overdueCount: 0 };

  let baseQuery = db.select({
    status: bookings.status,
    paymentMethod: bookings.paymentMethod,
    paidAt: bookings.paidAt,
    totalAmount: bookings.totalAmount,
    gstAmount: bookings.gstAmount,
    approvedAt: bookings.approvedAt,
  }).from(bookings);

  if (ownerId) {
    const centreRows = await db.select({ id: shoppingCentres.id }).from(shoppingCentres).where(eq(shoppingCentres.ownerId, ownerId));
    const centreIds = centreRows.map(c => c.id);
    if (centreIds.length === 0) return { all: 0, pending: 0, confirmed: 0, cancelled: 0, rejected: 0, completed: 0, unpaid: 0, totalOutstanding: 0, totalOverdue: 0, outstandingCount: 0, overdueCount: 0 };
    const siteRows = await db.select({ id: sites.id }).from(sites).where(inArray(sites.centreId, centreIds));
    const siteIds = siteRows.map(s => s.id);
    if (siteIds.length === 0) return { all: 0, pending: 0, confirmed: 0, cancelled: 0, rejected: 0, completed: 0, unpaid: 0, totalOutstanding: 0, totalOverdue: 0, outstandingCount: 0, overdueCount: 0 };
    baseQuery = baseQuery.where(inArray(bookings.siteId, siteIds)) as any;
  }

  const rows = await baseQuery;
  const now = new Date();
  let pending = 0, confirmed = 0, cancelled = 0, rejected = 0, completed = 0, unpaid = 0;
  let totalOutstanding = 0, totalOverdue = 0, outstandingCount = 0, overdueCount = 0;

  for (const b of rows) {
    if (b.status === 'pending') pending++;
    if (b.status === 'confirmed') confirmed++;
    if (b.status === 'cancelled') cancelled++;
    if (b.status === 'rejected') rejected++;
    if (b.status === 'completed') completed++;
    if (b.paymentMethod === 'invoice' && !b.paidAt && b.status !== 'rejected') unpaid++;

    if (b.status === 'confirmed' && !b.paidAt && b.approvedAt) {
      const total = Number(b.totalAmount || 0) + Number(b.gstAmount || 0);
      const due = new Date(b.approvedAt);
      due.setDate(due.getDate() + 14);
      if (due < now) {
        totalOverdue += total;
        overdueCount++;
      } else {
        totalOutstanding += total;
        outstandingCount++;
      }
    }
  }

  return { all: rows.length, pending, confirmed, cancelled, rejected, completed, unpaid, totalOutstanding, totalOverdue, outstandingCount, overdueCount };
}

