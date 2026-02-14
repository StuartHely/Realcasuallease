import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AdminUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AdminUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@casuallease.com",
    name: "Admin User",
    loginMethod: "email",
    role: "mega_admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Third Line Categories", () => {
  describe("thirdLineCategories.list", () => {
    it("returns all third line categories", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.thirdLineCategories.list();

      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe("thirdLineCategories.listActive", () => {
    it("returns only active third line categories", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.thirdLineCategories.listActive();

      expect(Array.isArray(categories)).toBe(true);
      // All returned categories should be active
      categories.forEach((cat: any) => {
        expect(cat.isActive).toBe(true);
      });
    });
  });

  describe("thirdLineCategories.create", () => {
    it("creates a new third line category (admin only)", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.thirdLineCategories.create({
        name: `Test Category ${Date.now()}`,
        displayOrder: 100,
        isActive: true,
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });

  describe("thirdLineCategories.update", () => {
    it("updates an existing third line category (admin only)", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a category
      const created = await caller.thirdLineCategories.create({
        name: `Update Test Category ${Date.now()}`,
        displayOrder: 101,
        isActive: true,
      });

      // Then update it
      const result = await caller.thirdLineCategories.update({
        id: created.id,
        name: `Updated Category ${Date.now()}`,
        displayOrder: 102,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("Vacant Shops", () => {
  let testCentreId: number;

  beforeAll(async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Get an existing centre or create one
    const centres = await caller.centres.list();
    if (centres.length > 0) {
      testCentreId = centres[0].id;
    } else {
      const centre = await caller.admin.createCentre({
        name: "Test Centre for Vacant Shops",
        address: "123 Test St",
        suburb: "Test Suburb",
        state: "NSW",
        postcode: "2000",
      });
      testCentreId = centre.id;
    }
  });

  describe("vacantShops.getByCentre", () => {
    it("returns all vacant shops for a centre", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const shops = await caller.vacantShops.getByCentre({ centreId: testCentreId });

      expect(Array.isArray(shops)).toBe(true);
    });
  });

  describe("vacantShops.getActiveByCentre", () => {
    it("returns only active vacant shops for a centre", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const shops = await caller.vacantShops.getActiveByCentre({ centreId: testCentreId });

      expect(Array.isArray(shops)).toBe(true);
      // All returned shops should be active
      shops.forEach((shop: any) => {
        expect(shop.isActive).toBe(true);
      });
    });
  });

  describe("vacantShops.create", () => {
    it("creates a new vacant shop (admin only)", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vacantShops.create({
        centreId: testCentreId,
        shopNumber: `VS-${Date.now()}`,
        totalSizeM2: "50",
        dimensions: "5m x 10m",
        powered: true,
        description: "Test vacant shop",
        pricePerWeek: "500",
        pricePerMonth: "1800",
        isActive: true,
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });

  describe("vacantShops.update", () => {
    it("updates an existing vacant shop (admin only)", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a shop
      const created = await caller.vacantShops.create({
        centreId: testCentreId,
        shopNumber: `VS-Update-${Date.now()}`,
        totalSizeM2: "60",
        powered: false,
        isActive: true,
      });

      // Then update it
      const result = await caller.vacantShops.update({
        id: created.id,
        totalSizeM2: "75",
        powered: true,
        description: "Updated description",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("vacantShops.getById", () => {
    it("returns a specific vacant shop by ID", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a shop
      const created = await caller.vacantShops.create({
        centreId: testCentreId,
        shopNumber: `VS-GetById-${Date.now()}`,
        totalSizeM2: "40",
        isActive: true,
      });

      // Then get it by ID
      const shop = await caller.vacantShops.getById({ id: created.id });

      expect(shop).toHaveProperty("id");
      expect(shop.id).toBe(created.id);
      expect(shop.totalSizeM2).toBe("40.00");
    });
  });
});

describe("Third Line Income", () => {
  let testCentreId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Get an existing centre or create one
    const centres = await caller.centres.list();
    if (centres.length > 0) {
      testCentreId = centres[0].id;
    } else {
      const centre = await caller.admin.createCentre({
        name: "Test Centre for Third Line Income",
        address: "456 Test St",
        suburb: "Test Suburb",
        state: "NSW",
        postcode: "2000",
      });
      testCentreId = centre.id;
    }

    // Get or create a category
    const categories = await caller.thirdLineCategories.listActive();
    if (categories.length > 0) {
      testCategoryId = categories[0].id;
    } else {
      const category = await caller.thirdLineCategories.create({
        name: `Test Category for TLI ${Date.now()}`,
        displayOrder: 1,
        isActive: true,
      });
      testCategoryId = category.id;
    }
  });

  describe("thirdLineIncome.getByCentre", () => {
    it("returns all third line income assets for a centre", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const assets = await caller.thirdLineIncome.getByCentre({ centreId: testCentreId });

      expect(Array.isArray(assets)).toBe(true);
    });
  });

  describe("thirdLineIncome.getActiveByCentre", () => {
    it("returns only active third line income assets for a centre", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const assets = await caller.thirdLineIncome.getActiveByCentre({ centreId: testCentreId });

      expect(Array.isArray(assets)).toBe(true);
      // All returned assets should be active
      assets.forEach((asset: any) => {
        expect(asset.isActive).toBe(true);
      });
    });
  });

  describe("thirdLineIncome.create", () => {
    it("creates a new third line income asset (admin only)", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.thirdLineIncome.create({
        centreId: testCentreId,
        assetNumber: `TLI-${Date.now()}`,
        categoryId: testCategoryId,
        dimensions: "1.5m x 0.8m",
        powered: true,
        description: "Test third line income asset",
        pricePerWeek: "200",
        pricePerMonth: "750",
        isActive: true,
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });

  describe("thirdLineIncome.update", () => {
    it("updates an existing third line income asset (admin only)", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create an asset
      const created = await caller.thirdLineIncome.create({
        centreId: testCentreId,
        assetNumber: `TLI-Update-${Date.now()}`,
        categoryId: testCategoryId,
        powered: false,
        isActive: true,
      });

      // Then update it
      const result = await caller.thirdLineIncome.update({
        id: created.id,
        dimensions: "2m x 1m",
        powered: true,
        description: "Updated description",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("thirdLineIncome.getById", () => {
    it("returns a specific third line income asset by ID", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create an asset
      const created = await caller.thirdLineIncome.create({
        centreId: testCentreId,
        assetNumber: `TLI-GetById-${Date.now()}`,
        categoryId: testCategoryId,
        dimensions: "1m x 1m",
        isActive: true,
      });

      // Then get it by ID
      const asset = await caller.thirdLineIncome.getById({ id: created.id });

      expect(asset).toHaveProperty("id");
      expect(asset.id).toBe(created.id);
      expect(asset.dimensions).toBe("1m x 1m");
    });
  });
});

describe("Unified Assets Query", () => {
  let testCentreId: number;

  beforeAll(async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Get an existing centre
    const centres = await caller.centres.list();
    if (centres.length > 0) {
      testCentreId = centres[0].id;
    }
  });

  describe("assets.getByCentre", () => {
    it("returns all assets for a centre when type is 'all'", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assets.getByCentre({ 
        centreId: testCentreId, 
        assetType: "all" 
      });

      expect(result).toHaveProperty("casualLeasing");
      expect(result).toHaveProperty("vacantShops");
      expect(result).toHaveProperty("thirdLineIncome");
      expect(Array.isArray(result.casualLeasing)).toBe(true);
      expect(Array.isArray(result.vacantShops)).toBe(true);
      expect(Array.isArray(result.thirdLineIncome)).toBe(true);
    });

    it("returns only casual leasing sites when type is 'casual_leasing'", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assets.getByCentre({ 
        centreId: testCentreId, 
        assetType: "casual_leasing" 
      });

      expect(result).toHaveProperty("casualLeasing");
      expect(Array.isArray(result.casualLeasing)).toBe(true);
    });

    it("returns only vacant shops when type is 'vacant_shops'", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assets.getByCentre({ 
        centreId: testCentreId, 
        assetType: "vacant_shops" 
      });

      expect(result).toHaveProperty("vacantShops");
      expect(Array.isArray(result.vacantShops)).toBe(true);
    });

    it("returns only third line income when type is 'third_line'", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assets.getByCentre({ 
        centreId: testCentreId, 
        assetType: "third_line" 
      });

      expect(result).toHaveProperty("thirdLineIncome");
      expect(Array.isArray(result.thirdLineIncome)).toBe(true);
    });
  });
});
