import { getDb } from "./db";
import { 
  vacantShops, 
  thirdLineIncome, 
  thirdLineCategories,
  sites,
  floorLevels,
  type InsertVacantShop,
  type InsertThirdLineIncome,
  type InsertThirdLineCategory
} from "../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

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
  const [result] = await db.insert(thirdLineCategories).values(data);
  return result.insertId;
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
  const [result] = await db.insert(vacantShops).values(data);
  return result.insertId;
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
  const [result] = await db.insert(thirdLineIncome).values(data);
  return result.insertId;
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
  }

  if (assetType === "all" || assetType === "vacant_shops") {
    results.vacantShops = await getActiveVacantShopsByCentre(centreId);
  }

  if (assetType === "all" || assetType === "third_line") {
    results.thirdLineIncome = await getActiveThirdLineIncomeByCentre(centreId);
  }

  return results;
}
