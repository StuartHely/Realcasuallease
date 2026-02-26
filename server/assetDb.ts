import { getDb } from "./db";
import { 
  vacantShops, 
  thirdLineIncome, 
  thirdLineCategories,
  sites,
  floorLevels,
  vacantShopBookings,
  thirdLineBookings,
  shoppingCentres,
  type InsertVacantShop,
  type InsertThirdLineIncome,
  type InsertThirdLineCategory,
  type InsertVacantShopBooking,
  type InsertThirdLineBooking
} from "../drizzle/schema";
import { eq, and, asc, sql, gte, lte, or, ne } from "drizzle-orm";

// ============ Third Line Categories ============

export async function getAllThirdLineCategories() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(thirdLineCategories)
    .orderBy(asc(thirdLineCategories.displayOrder));
}

export async function getActiveThirdLineCategories() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(thirdLineCategories)
    .where(eq(thirdLineCategories.isActive, true))
    .orderBy(asc(thirdLineCategories.displayOrder));
}

export async function createThirdLineCategory(data: Omit<InsertThirdLineCategory, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(thirdLineCategories).values(data).returning({ id: thirdLineCategories.id });
  return result.id;
}

export async function updateThirdLineCategory(id: number, data: Partial<InsertThirdLineCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(thirdLineCategories).set(data).where(eq(thirdLineCategories.id, id));
}

export async function deleteThirdLineCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(thirdLineCategories).where(eq(thirdLineCategories.id, id));
}

// ============ Vacant Shops ============

export async function getVacantShopsByCentre(centreId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: vacantShops.id,
      centreId: vacantShops.centreId,
      shopNumber: vacantShops.shopNumber,
      totalSizeM2: vacantShops.totalSizeM2,
      dimensions: vacantShops.dimensions,
      powered: vacantShops.powered,
      description: vacantShops.description,
      imageUrl1: vacantShops.imageUrl1,
      imageUrl2: vacantShops.imageUrl2,
      pricePerWeek: vacantShops.pricePerWeek,
      pricePerMonth: vacantShops.pricePerMonth,
      floorLevelId: vacantShops.floorLevelId,
      mapMarkerX: vacantShops.mapMarkerX,
      mapMarkerY: vacantShops.mapMarkerY,
      isActive: vacantShops.isActive,
      createdAt: vacantShops.createdAt,
      floorLevelName: floorLevels.levelName,
    })
    .from(vacantShops)
    .leftJoin(floorLevels, eq(vacantShops.floorLevelId, floorLevels.id))
    .where(eq(vacantShops.centreId, centreId))
    .orderBy(asc(vacantShops.shopNumber));
}

export async function getActiveVacantShopsByCentre(centreId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: vacantShops.id,
      centreId: vacantShops.centreId,
      shopNumber: vacantShops.shopNumber,
      totalSizeM2: vacantShops.totalSizeM2,
      dimensions: vacantShops.dimensions,
      powered: vacantShops.powered,
      description: vacantShops.description,
      imageUrl1: vacantShops.imageUrl1,
      imageUrl2: vacantShops.imageUrl2,
      pricePerWeek: vacantShops.pricePerWeek,
      pricePerMonth: vacantShops.pricePerMonth,
      floorLevelId: vacantShops.floorLevelId,
      mapMarkerX: vacantShops.mapMarkerX,
      mapMarkerY: vacantShops.mapMarkerY,
      isActive: vacantShops.isActive,
      floorLevelName: floorLevels.levelName,
    })
    .from(vacantShops)
    .leftJoin(floorLevels, eq(vacantShops.floorLevelId, floorLevels.id))
    .where(and(eq(vacantShops.centreId, centreId), eq(vacantShops.isActive, true)))
    .orderBy(asc(vacantShops.shopNumber));
}

export async function getVacantShopById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [shop] = await db
    .select()
    .from(vacantShops)
    .where(eq(vacantShops.id, id));
  return shop;
}

export async function createVacantShop(data: Omit<InsertVacantShop, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(vacantShops).values(data).returning({ id: vacantShops.id });
  return result.id;
}

export async function updateVacantShop(id: number, data: Partial<InsertVacantShop>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(vacantShops).set(data).where(eq(vacantShops.id, id));
}

export async function deleteVacantShop(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(vacantShops).where(eq(vacantShops.id, id));
}

// ============ Third Line Income ============

export async function getThirdLineIncomeByCentre(centreId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: thirdLineIncome.id,
      centreId: thirdLineIncome.centreId,
      assetNumber: thirdLineIncome.assetNumber,
      categoryId: thirdLineIncome.categoryId,
      categoryName: thirdLineCategories.name,
      dimensions: thirdLineIncome.dimensions,
      powered: thirdLineIncome.powered,
      description: thirdLineIncome.description,
      imageUrl1: thirdLineIncome.imageUrl1,
      imageUrl2: thirdLineIncome.imageUrl2,
      pricePerWeek: thirdLineIncome.pricePerWeek,
      pricePerMonth: thirdLineIncome.pricePerMonth,
      outgoingsPerDay: thirdLineIncome.outgoingsPerDay,
      floorLevelId: thirdLineIncome.floorLevelId,
      mapMarkerX: thirdLineIncome.mapMarkerX,
      mapMarkerY: thirdLineIncome.mapMarkerY,
      isActive: thirdLineIncome.isActive,
      createdAt: thirdLineIncome.createdAt,
      floorLevelName: floorLevels.levelName,
    })
    .from(thirdLineIncome)
    .leftJoin(thirdLineCategories, eq(thirdLineIncome.categoryId, thirdLineCategories.id))
    .leftJoin(floorLevels, eq(thirdLineIncome.floorLevelId, floorLevels.id))
    .where(eq(thirdLineIncome.centreId, centreId))
    .orderBy(asc(thirdLineIncome.assetNumber));
}

export async function getActiveThirdLineIncomeByCentre(centreId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: thirdLineIncome.id,
      centreId: thirdLineIncome.centreId,
      assetNumber: thirdLineIncome.assetNumber,
      categoryId: thirdLineIncome.categoryId,
      categoryName: thirdLineCategories.name,
      dimensions: thirdLineIncome.dimensions,
      powered: thirdLineIncome.powered,
      description: thirdLineIncome.description,
      imageUrl1: thirdLineIncome.imageUrl1,
      imageUrl2: thirdLineIncome.imageUrl2,
      pricePerWeek: thirdLineIncome.pricePerWeek,
      pricePerMonth: thirdLineIncome.pricePerMonth,
      outgoingsPerDay: thirdLineIncome.outgoingsPerDay,
      floorLevelId: thirdLineIncome.floorLevelId,
      mapMarkerX: thirdLineIncome.mapMarkerX,
      mapMarkerY: thirdLineIncome.mapMarkerY,
      isActive: thirdLineIncome.isActive,
      floorLevelName: floorLevels.levelName,
    })
    .from(thirdLineIncome)
    .leftJoin(thirdLineCategories, eq(thirdLineIncome.categoryId, thirdLineCategories.id))
    .leftJoin(floorLevels, eq(thirdLineIncome.floorLevelId, floorLevels.id))
    .where(and(eq(thirdLineIncome.centreId, centreId), eq(thirdLineIncome.isActive, true)))
    .orderBy(asc(thirdLineIncome.assetNumber));
}

export async function getThirdLineIncomeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [asset] = await db
    .select({
      id: thirdLineIncome.id,
      centreId: thirdLineIncome.centreId,
      assetNumber: thirdLineIncome.assetNumber,
      categoryId: thirdLineIncome.categoryId,
      categoryName: thirdLineCategories.name,
      dimensions: thirdLineIncome.dimensions,
      powered: thirdLineIncome.powered,
      description: thirdLineIncome.description,
      imageUrl1: thirdLineIncome.imageUrl1,
      imageUrl2: thirdLineIncome.imageUrl2,
      pricePerWeek: thirdLineIncome.pricePerWeek,
      pricePerMonth: thirdLineIncome.pricePerMonth,
      outgoingsPerDay: thirdLineIncome.outgoingsPerDay,
      floorLevelId: thirdLineIncome.floorLevelId,
      mapMarkerX: thirdLineIncome.mapMarkerX,
      mapMarkerY: thirdLineIncome.mapMarkerY,
      isActive: thirdLineIncome.isActive,
    })
    .from(thirdLineIncome)
    .leftJoin(thirdLineCategories, eq(thirdLineIncome.categoryId, thirdLineCategories.id))
    .where(eq(thirdLineIncome.id, id));
  return asset;
}

export async function createThirdLineIncome(data: Omit<InsertThirdLineIncome, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(thirdLineIncome).values(data).returning({ id: thirdLineIncome.id });
  return result.id;
}

export async function updateThirdLineIncome(id: number, data: Partial<InsertThirdLineIncome>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(thirdLineIncome).set(data).where(eq(thirdLineIncome.id, id));
}

export async function deleteThirdLineIncome(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(thirdLineIncome).where(eq(thirdLineIncome.id, id));
}

// ============ Unified Asset Query ============

export type AssetType = "casual_leasing" | "vacant_shops" | "third_line" | "all";

export async function getAllAssetsByCentre(centreId: number, assetType: AssetType = "all") {
  const db = await getDb();
  if (!db) return { casualLeasing: [], vacantShops: [], thirdLineIncome: [] };

  const results: {
    casualLeasing: any[];
    vacantShops: any[];
    thirdLineIncome: any[];
  } = {
    casualLeasing: [],
    vacantShops: [],
    thirdLineIncome: [],
  };

  if (assetType === "all" || assetType === "casual_leasing") {
    results.casualLeasing = await db
      .select({
        id: sites.id,
        siteNumber: sites.siteNumber,
        description: sites.description,
        size: sites.size,
        pricePerDay: sites.pricePerDay,
        pricePerWeek: sites.pricePerWeek,
        floorLevelId: sites.floorLevelId,
        mapMarkerX: sites.mapMarkerX,
        mapMarkerY: sites.mapMarkerY,
        isActive: sites.isActive,
        floorLevelName: floorLevels.levelName,
      })
      .from(sites)
      .leftJoin(floorLevels, eq(sites.floorLevelId, floorLevels.id))
      .where(and(eq(sites.centreId, centreId), eq(sites.isActive, true)));
    
    // Sort sites using natural/alphanumeric ordering (1, 2, 3, ... 10, 11, 12, ... 9a, VK13)
    results.casualLeasing.sort((a, b) => {
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
  }

  if (assetType === "all" || assetType === "vacant_shops") {
    results.vacantShops = await getActiveVacantShopsByCentre(centreId);
  }

  if (assetType === "all" || assetType === "third_line") {
    results.thirdLineIncome = await getActiveThirdLineIncomeByCentre(centreId);
  }

  return results;
}

// ============ Vacant Shop Bookings ============

export async function getVacantShopBookingsByShop(vacantShopId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(vacantShopBookings)
    .where(eq(vacantShopBookings.vacantShopId, vacantShopId))
    .orderBy(asc(vacantShopBookings.startDate));
}

export async function getVacantShopBookingsByCentre(centreId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all vacant shops for this centre first
  const shops = await db
    .select({ id: vacantShops.id })
    .from(vacantShops)
    .where(eq(vacantShops.centreId, centreId));
  
  if (shops.length === 0) return [];
  
  const shopIds = shops.map(s => s.id);
  
  let query = db
    .select({
      id: vacantShopBookings.id,
      bookingNumber: vacantShopBookings.bookingNumber,
      vacantShopId: vacantShopBookings.vacantShopId,
      shopNumber: vacantShops.shopNumber,
      customerId: vacantShopBookings.customerId,
      startDate: vacantShopBookings.startDate,
      endDate: vacantShopBookings.endDate,
      totalAmount: vacantShopBookings.totalAmount,
      status: vacantShopBookings.status,
    })
    .from(vacantShopBookings)
    .innerJoin(vacantShops, eq(vacantShopBookings.vacantShopId, vacantShops.id))
    .where(sql`${vacantShopBookings.vacantShopId} IN (${sql.join(shopIds, sql`, `)})`);
  
  return query.orderBy(asc(vacantShopBookings.startDate));
}

export async function checkVacantShopAvailability(
  vacantShopId: number, 
  startDate: Date, 
  endDate: Date,
  excludeBookingId?: number
) {
  const db = await getDb();
  if (!db) return true;
  
  // Check for overlapping bookings (confirmed or pending)
  const conditions = [
    eq(vacantShopBookings.vacantShopId, vacantShopId),
    or(
      eq(vacantShopBookings.status, "confirmed"),
      eq(vacantShopBookings.status, "pending")
    ),
    // Overlapping date check: existing.start < new.end AND existing.end > new.start
    lte(vacantShopBookings.startDate, endDate),
    gte(vacantShopBookings.endDate, startDate),
  ];
  
  if (excludeBookingId) {
    conditions.push(ne(vacantShopBookings.id, excludeBookingId));
  }
  
  const overlapping = await db
    .select({ id: vacantShopBookings.id })
    .from(vacantShopBookings)
    .where(and(...conditions));
  
  return overlapping.length === 0;
}

export async function createVacantShopBooking(data: Omit<InsertVacantShopBooking, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(vacantShopBookings).values(data).returning({ id: vacantShopBookings.id });
  return result.id;
}

export async function updateVacantShopBooking(id: number, data: Partial<InsertVacantShopBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(vacantShopBookings).set(data).where(eq(vacantShopBookings.id, id));
}

export async function getVacantShopBookingById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [booking] = await db
    .select()
    .from(vacantShopBookings)
    .where(eq(vacantShopBookings.id, id));
  return booking;
}

// Generate booking number with centre code
export async function generateVacantShopBookingNumber(vacantShopId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get centre code from vacant shop
  const [shop] = await db
    .select({
      centreCode: shoppingCentres.centreCode,
    })
    .from(vacantShops)
    .innerJoin(shoppingCentres, eq(vacantShops.centreId, shoppingCentres.id))
    .where(eq(vacantShops.id, vacantShopId));
  
  const centreCode = shop?.centreCode || "VS";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `VS-${centreCode}-${timestamp}-${random}`;
}

// ============ Third Line Bookings ============

export async function getThirdLineBookingsByAsset(thirdLineIncomeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(thirdLineBookings)
    .where(eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncomeId))
    .orderBy(asc(thirdLineBookings.startDate));
}

export async function getThirdLineBookingsByCentre(centreId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all third line income assets for this centre first
  const assets = await db
    .select({ id: thirdLineIncome.id })
    .from(thirdLineIncome)
    .where(eq(thirdLineIncome.centreId, centreId));
  
  if (assets.length === 0) return [];
  
  const assetIds = assets.map(a => a.id);
  
  let query = db
    .select({
      id: thirdLineBookings.id,
      bookingNumber: thirdLineBookings.bookingNumber,
      thirdLineIncomeId: thirdLineBookings.thirdLineIncomeId,
      assetNumber: thirdLineIncome.assetNumber,
      categoryName: thirdLineCategories.name,
      customerId: thirdLineBookings.customerId,
      startDate: thirdLineBookings.startDate,
      endDate: thirdLineBookings.endDate,
      totalAmount: thirdLineBookings.totalAmount,
      status: thirdLineBookings.status,
    })
    .from(thirdLineBookings)
    .innerJoin(thirdLineIncome, eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncome.id))
    .leftJoin(thirdLineCategories, eq(thirdLineIncome.categoryId, thirdLineCategories.id))
    .where(sql`${thirdLineBookings.thirdLineIncomeId} IN (${sql.join(assetIds, sql`, `)})`);
  
  return query.orderBy(asc(thirdLineBookings.startDate));
}

export async function checkThirdLineAvailability(
  thirdLineIncomeId: number, 
  startDate: Date, 
  endDate: Date,
  excludeBookingId?: number
) {
  const db = await getDb();
  if (!db) return true;
  
  // Check for overlapping bookings (confirmed or pending)
  const conditions = [
    eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncomeId),
    or(
      eq(thirdLineBookings.status, "confirmed"),
      eq(thirdLineBookings.status, "pending")
    ),
    // Overlapping date check
    lte(thirdLineBookings.startDate, endDate),
    gte(thirdLineBookings.endDate, startDate),
  ];
  
  if (excludeBookingId) {
    conditions.push(ne(thirdLineBookings.id, excludeBookingId));
  }
  
  const overlapping = await db
    .select({ id: thirdLineBookings.id })
    .from(thirdLineBookings)
    .where(and(...conditions));
  
  return overlapping.length === 0;
}

export async function createThirdLineBooking(data: Omit<InsertThirdLineBooking, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(thirdLineBookings).values(data).returning({ id: thirdLineBookings.id });
  return result.id;
}

export async function updateThirdLineBooking(id: number, data: Partial<InsertThirdLineBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(thirdLineBookings).set(data).where(eq(thirdLineBookings.id, id));
}

export async function getThirdLineBookingById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [booking] = await db
    .select()
    .from(thirdLineBookings)
    .where(eq(thirdLineBookings.id, id));
  return booking;
}

// Generate booking number with centre code
export async function generateThirdLineBookingNumber(thirdLineIncomeId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get centre code from third line income asset
  const [asset] = await db
    .select({
      centreCode: shoppingCentres.centreCode,
    })
    .from(thirdLineIncome)
    .innerJoin(shoppingCentres, eq(thirdLineIncome.centreId, shoppingCentres.id))
    .where(eq(thirdLineIncome.id, thirdLineIncomeId));
  
  const centreCode = asset?.centreCode || "3L";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `3L-${centreCode}-${timestamp}-${random}`;
}

// ============ Availability Calendar Data ============

export async function getVacantShopAvailabilityCalendar(centreId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active vacant shops for this centre
  const shops = await getActiveVacantShopsByCentre(centreId);
  
  // Get all bookings in the date range
  const shopIds = shops.map(s => s.id);
  if (shopIds.length === 0) return [];
  
  const bookings = await db
    .select({
      vacantShopId: vacantShopBookings.vacantShopId,
      startDate: vacantShopBookings.startDate,
      endDate: vacantShopBookings.endDate,
      status: vacantShopBookings.status,
    })
    .from(vacantShopBookings)
    .where(and(
      sql`${vacantShopBookings.vacantShopId} IN (${sql.join(shopIds, sql`, `)})`,
      lte(vacantShopBookings.startDate, endDate),
      gte(vacantShopBookings.endDate, startDate),
      or(
        eq(vacantShopBookings.status, "confirmed"),
        eq(vacantShopBookings.status, "pending")
      )
    ));
  
  return shops.map(shop => ({
    ...shop,
    assetType: "vacant_shops" as const,
    bookings: bookings.filter(b => b.vacantShopId === shop.id),
  }));
}

export async function getThirdLineAvailabilityCalendar(centreId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active third line income assets for this centre
  const assets = await getActiveThirdLineIncomeByCentre(centreId);
  
  // Get all bookings in the date range
  const assetIds = assets.map(a => a.id);
  if (assetIds.length === 0) return [];
  
  const bookings = await db
    .select({
      thirdLineIncomeId: thirdLineBookings.thirdLineIncomeId,
      startDate: thirdLineBookings.startDate,
      endDate: thirdLineBookings.endDate,
      status: thirdLineBookings.status,
    })
    .from(thirdLineBookings)
    .where(and(
      sql`${thirdLineBookings.thirdLineIncomeId} IN (${sql.join(assetIds, sql`, `)})`,
      lte(thirdLineBookings.startDate, endDate),
      gte(thirdLineBookings.endDate, startDate),
      or(
        eq(thirdLineBookings.status, "confirmed"),
        eq(thirdLineBookings.status, "pending")
      )
    ));
  
  return assets.map(asset => ({
    ...asset,
    assetType: "third_line" as const,
    bookings: bookings.filter(b => b.thirdLineIncomeId === asset.id),
  }));
}


// ============ Admin Booking List Functions ============

export async function listVacantShopBookings(status?: "pending" | "confirmed" | "cancelled" | "completed" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (status) {
    conditions.push(eq(vacantShopBookings.status, status));
  }
  
  const query = db
    .select({
      id: vacantShopBookings.id,
      bookingNumber: vacantShopBookings.bookingNumber,
      vacantShopId: vacantShopBookings.vacantShopId,
      shopName: vacantShops.shopNumber,
      centreName: shoppingCentres.name,
      customerId: vacantShopBookings.customerId,
      customerEmail: vacantShopBookings.customerEmail,
      customerName: sql<string>`COALESCE(${vacantShopBookings.customerEmail}, 'N/A')`,
      startDate: vacantShopBookings.startDate,
      endDate: vacantShopBookings.endDate,
      totalAmount: vacantShopBookings.totalAmount,
      status: vacantShopBookings.status,
      paymentMethod: vacantShopBookings.paymentMethod,
      createdAt: vacantShopBookings.createdAt,
    })
    .from(vacantShopBookings)
    .innerJoin(vacantShops, eq(vacantShopBookings.vacantShopId, vacantShops.id))
    .innerJoin(shoppingCentres, eq(vacantShops.centreId, shoppingCentres.id));
  
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(asc(vacantShopBookings.createdAt));
  }
  
  return query.orderBy(asc(vacantShopBookings.createdAt));
}

export async function listThirdLineBookings(status?: "pending" | "confirmed" | "cancelled" | "completed" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (status) {
    conditions.push(eq(thirdLineBookings.status, status));
  }
  
  const query = db
    .select({
      id: thirdLineBookings.id,
      bookingNumber: thirdLineBookings.bookingNumber,
      thirdLineIncomeId: thirdLineBookings.thirdLineIncomeId,
      assetName: thirdLineIncome.assetNumber,
      categoryName: thirdLineCategories.name,
      centreName: shoppingCentres.name,
      customerId: thirdLineBookings.customerId,
      customerEmail: thirdLineBookings.customerEmail,
      customerName: sql<string>`COALESCE(${thirdLineBookings.customerEmail}, 'N/A')`,
      startDate: thirdLineBookings.startDate,
      endDate: thirdLineBookings.endDate,
      totalAmount: thirdLineBookings.totalAmount,
      status: thirdLineBookings.status,
      paymentMethod: thirdLineBookings.paymentMethod,
      createdAt: thirdLineBookings.createdAt,
    })
    .from(thirdLineBookings)
    .innerJoin(thirdLineIncome, eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncome.id))
    .innerJoin(shoppingCentres, eq(thirdLineIncome.centreId, shoppingCentres.id))
    .leftJoin(thirdLineCategories, eq(thirdLineIncome.categoryId, thirdLineCategories.id));
  
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(asc(thirdLineBookings.createdAt));
  }
  
  return query.orderBy(asc(thirdLineBookings.createdAt));
}
