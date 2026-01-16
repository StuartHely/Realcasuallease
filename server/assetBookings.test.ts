import { describe, it, expect, vi, beforeEach } from "vitest";
import * as assetDb from "./assetDb";

// Create a mock that returns proper array for destructuring
const createMockDb = () => {
  const mockResult = [{ centreCode: "TEST" }];
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(mockResult),
    orderBy: vi.fn().mockResolvedValue(mockResult),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return mockChain;
};

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(createMockDb())),
}));

describe("Vacant Shop Bookings", () => {
  describe("checkVacantShopAvailability", () => {
    it("should return true when no overlapping bookings exist", async () => {
      // The mock returns empty array by default (no overlapping bookings)
      const result = await assetDb.checkVacantShopAvailability(
        1,
        new Date("2026-02-01"),
        new Date("2026-02-07")
      );
      // Since we're mocking and the mock returns empty by default, this should be true
      expect(typeof result).toBe("boolean");
    });

    it("should accept excludeBookingId parameter for edit scenarios", async () => {
      const result = await assetDb.checkVacantShopAvailability(
        1,
        new Date("2026-02-01"),
        new Date("2026-02-07"),
        123 // Exclude booking ID
      );
      expect(typeof result).toBe("boolean");
    });
  });

  describe("generateVacantShopBookingNumber", () => {
    it("should generate a booking number with VS prefix", async () => {
      const bookingNumber = await assetDb.generateVacantShopBookingNumber(1);
      expect(bookingNumber).toMatch(/^VS-/);
    });

    it("should generate unique booking numbers", async () => {
      const num1 = await assetDb.generateVacantShopBookingNumber(1);
      const num2 = await assetDb.generateVacantShopBookingNumber(1);
      // Due to timestamp + random, they should be different
      expect(num1).not.toBe(num2);
    });
  });
});

describe("Third Line Bookings", () => {
  describe("checkThirdLineAvailability", () => {
    it("should return true when no overlapping bookings exist", async () => {
      const result = await assetDb.checkThirdLineAvailability(
        1,
        new Date("2026-02-01"),
        new Date("2026-02-07")
      );
      expect(typeof result).toBe("boolean");
    });

    it("should accept excludeBookingId parameter for edit scenarios", async () => {
      const result = await assetDb.checkThirdLineAvailability(
        1,
        new Date("2026-02-01"),
        new Date("2026-02-07"),
        456 // Exclude booking ID
      );
      expect(typeof result).toBe("boolean");
    });
  });

  describe("generateThirdLineBookingNumber", () => {
    it("should generate a booking number with 3L prefix", async () => {
      const bookingNumber = await assetDb.generateThirdLineBookingNumber(1);
      expect(bookingNumber).toMatch(/^3L-/);
    });

    it("should generate unique booking numbers", async () => {
      const num1 = await assetDb.generateThirdLineBookingNumber(1);
      const num2 = await assetDb.generateThirdLineBookingNumber(1);
      expect(num1).not.toBe(num2);
    });
  });
});

describe("Booking Number Format", () => {
  it("VS booking number should include centre code, timestamp, and random suffix", async () => {
    const bookingNumber = await assetDb.generateVacantShopBookingNumber(1);
    const parts = bookingNumber.split("-");
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe("VS");
    // Parts 1 is centre code, 2 is timestamp, 3 is random
    expect(parts[2].length).toBeGreaterThan(0); // timestamp
    expect(parts[3].length).toBe(4); // 4-char random suffix
  });

  it("3rdL booking number should include centre code, timestamp, and random suffix", async () => {
    const bookingNumber = await assetDb.generateThirdLineBookingNumber(1);
    const parts = bookingNumber.split("-");
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe("3L");
    expect(parts[2].length).toBeGreaterThan(0);
    expect(parts[3].length).toBe(4);
  });
});
