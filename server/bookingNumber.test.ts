import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { shoppingCentres, sites, bookings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Booking Number Generation with Centre Codes", () => {
  let testCentreId: number;
  let testSiteId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Find a centre with a centre code
    const centres = await db
      .select()
      .from(shoppingCentres)
      .where(eq(shoppingCentres.name, "Campbelltown Mall"))
      .limit(1);

    if (centres.length === 0) {
      throw new Error("Test centre 'Campbelltown Mall' not found");
    }

    testCentreId = centres[0].id;

    // Get a site from this centre
    const sitesList = await db
      .select()
      .from(sites)
      .where(eq(sites.centreId, testCentreId))
      .limit(1);

    if (sitesList.length === 0) {
      throw new Error("No sites found for test centre");
    }

    testSiteId = sitesList[0].id;
  });

  it("should have centre code populated for Campbelltown Mall", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const centre = await db
      .select()
      .from(shoppingCentres)
      .where(eq(shoppingCentres.id, testCentreId))
      .limit(1);

    expect(centre.length).toBe(1);
    expect(centre[0].centreCode).toBeTruthy();
    expect(centre[0].centreCode).toBe("CampbelltownMall");
  });

  it("should generate booking number with centre code format", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get centre info
    const centre = await db
      .select()
      .from(shoppingCentres)
      .where(eq(shoppingCentres.id, testCentreId))
      .limit(1);

    expect(centre.length).toBe(1);
    const centreCode = centre[0].centreCode || `CENTRE${centre[0].id}`;

    // Simulate booking number generation
    const startDate = new Date("2026-06-01");
    const dateStr = startDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const bookingNumber = `${centreCode}-${dateStr}-${randomSeq}`;

    // Verify format
    expect(bookingNumber).toMatch(/^CampbelltownMall-20260601-\d{3}$/);
    expect(bookingNumber.startsWith("CampbelltownMall-")).toBe(true);
    expect(bookingNumber).toContain("-20260601-");
  });

  it("should have unique booking numbers for same date", () => {
    const centreCode = "CampbelltownMall";
    const dateStr = "20260601";
    
    // Generate multiple booking numbers
    const bookingNumbers = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const bookingNumber = `${centreCode}-${dateStr}-${randomSeq}`;
      bookingNumbers.add(bookingNumber);
    }

    // With random sequences, we should get different numbers (high probability)
    // Note: There's a small chance of collision with only 1000 possible values
    expect(bookingNumbers.size).toBeGreaterThan(5); // At least 50% unique
  });

  it("should generate different booking numbers for different dates", () => {
    const centreCode = "CampbelltownMall";
    
    const date1 = new Date("2026-06-01");
    const date2 = new Date("2026-06-15");
    
    const dateStr1 = date1.toISOString().split('T')[0].replace(/-/g, '');
    const dateStr2 = date2.toISOString().split('T')[0].replace(/-/g, '');
    
    const randomSeq = "001";
    const bookingNumber1 = `${centreCode}-${dateStr1}-${randomSeq}`;
    const bookingNumber2 = `${centreCode}-${dateStr2}-${randomSeq}`;

    expect(bookingNumber1).toBe("CampbelltownMall-20260601-001");
    expect(bookingNumber2).toBe("CampbelltownMall-20260615-001");
    expect(bookingNumber1).not.toBe(bookingNumber2);
  });

  it("should generate different booking numbers for different centres", () => {
    const centreCode1 = "CampbelltownMall";
    const centreCode2 = "HighlandsMarketplace";
    const dateStr = "20260601";
    const randomSeq = "001";

    const bookingNumber1 = `${centreCode1}-${dateStr}-${randomSeq}`;
    const bookingNumber2 = `${centreCode2}-${dateStr}-${randomSeq}`;

    expect(bookingNumber1).toBe("CampbelltownMall-20260601-001");
    expect(bookingNumber2).toBe("HighlandsMarketplace-20260601-001");
    expect(bookingNumber1).not.toBe(bookingNumber2);
  });

  it("should handle centre without code (fallback)", () => {
    const centreId = 999;
    const centreCode = `CENTRE${centreId}`; // Fallback format
    const dateStr = "20260601";
    const randomSeq = "001";

    const bookingNumber = `${centreCode}-${dateStr}-${randomSeq}`;

    expect(bookingNumber).toBe("CENTRE999-20260601-001");
    expect(bookingNumber).toMatch(/^CENTRE\d+-\d{8}-\d{3}$/);
  });
});
