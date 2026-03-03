import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./seasonalRatesDb", () => ({
  getSeasonalRatesForDateRange: vi.fn().mockResolvedValue([]),
}));

import { calculateBookingCost } from "./bookingCalculation";
import { getSeasonalRatesForDateRange } from "./seasonalRatesDb";

const mockedGetSeasonalRates = vi.mocked(getSeasonalRatesForDateRange);

/** Helper: create a UTC midnight date to avoid local-timezone offset issues. */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

describe("calculateBookingCost", () => {
  const site = {
    id: 1,
    pricePerDay: "100.00",
    pricePerWeek: "600.00",
    weekendPricePerDay: "150.00",
  };

  const siteNoWeekly = {
    id: 2,
    pricePerDay: "100.00",
    pricePerWeek: "0",
    weekendPricePerDay: "150.00",
  };

  beforeEach(() => {
    mockedGetSeasonalRates.mockReset();
    mockedGetSeasonalRates.mockResolvedValue([]);
  });

  // ───────────────────────────────────────────────────
  // No seasonal rates
  // ───────────────────────────────────────────────────

  describe("No seasonal rates", () => {
    it("single weekday = weekday daily rate", async () => {
      // Monday Jan 6, 2025
      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 6));
      expect(result.weekdayCount).toBe(1);
      expect(result.weekendCount).toBe(0);
      expect(result.totalAmount).toBe(100);
    });

    it("single weekend day = weekend daily rate", async () => {
      // Saturday Jan 11, 2025
      const result = await calculateBookingCost(site, utc(2025, 0, 11), utc(2025, 0, 11));
      expect(result.weekdayCount).toBe(0);
      expect(result.weekendCount).toBe(1);
      expect(result.totalAmount).toBe(150);
    });

    it("weekdays only Mon-Fri (5 days) = 5 × weekday daily rate", async () => {
      // Mon Jan 6 – Fri Jan 10, 2025
      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 10));
      expect(result.weekdayCount).toBe(5);
      expect(result.weekendCount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });

    it("mixed week Mon-Sun (7 days) = weekly rate", async () => {
      // Mon Jan 6 – Sun Jan 12, 2025
      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 12));
      expect(result.weekdayCount).toBe(5);
      expect(result.weekendCount).toBe(2);
      expect(result.totalAmount).toBe(600);
    });

    it("2 weeks (14 days) = 2 × weekly rate", async () => {
      // Mon Jan 6 – Sun Jan 19, 2025
      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 19));
      expect(result.weekdayCount).toBe(10);
      expect(result.weekendCount).toBe(4);
      expect(result.totalAmount).toBe(1200);
    });

    it("1 week + 3 weekdays = weekly rate + 3 × weekday rate", async () => {
      // Mon Jan 6 – Wed Jan 15, 2025 (10 days)
      // 7 days weekly (600) + Mon 13, Tue 14, Wed 15 (3 × 100)
      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 15));
      expect(result.totalAmount).toBe(600 + 3 * 100); // 900
    });

    it("1 week + weekend days remaining = weekly rate + weekend daily rates", async () => {
      // Mon Jan 6 – Sat Jan 18, 2025 (13 days = 1 week + 6 remaining)
      // Remaining 6: Mon 13, Tue 14, Wed 15, Thu 16, Fri 17 (5 weekday), Sat 18 (1 weekend)
      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 18));
      expect(result.totalAmount).toBe(600 + 5 * 100 + 1 * 150); // 1250
    });

    it("no weekly rate, 7 days = 5 × weekday + 2 × weekend daily rates", async () => {
      // Mon Jan 6 – Sun Jan 12, 2025
      const result = await calculateBookingCost(siteNoWeekly, utc(2025, 0, 6), utc(2025, 0, 12));
      expect(result.weekdayCount).toBe(5);
      expect(result.weekendCount).toBe(2);
      expect(result.totalAmount).toBe(5 * 100 + 2 * 150); // 800
    });

    it("should default weekend rate to weekday rate when not specified", async () => {
      const siteNoWeekend = { id: 3, pricePerDay: "100.00", pricePerWeek: "600.00", weekendPricePerDay: null };
      // Sat Jan 11 – Sun Jan 12, 2025
      const result = await calculateBookingCost(siteNoWeekend, utc(2025, 0, 11), utc(2025, 0, 12));
      expect(result.weekendCount).toBe(2);
      expect(result.totalAmount).toBe(200); // 2 × 100
    });
  });

  // ───────────────────────────────────────────────────
  // Single seasonal period covering entire booking
  // ───────────────────────────────────────────────────

  describe("Single seasonal period covering entire booking", () => {
    it("7 days with seasonal weekly rate = seasonal weekly rate", async () => {
      // Mon Jan 6 – Sun Jan 12, 2025
      mockedGetSeasonalRates.mockResolvedValue([
        {
          id: 10,
          siteId: 1,
          name: "Summer",
          startDate: "2025-01-01",
          endDate: "2025-01-31",
          weekdayRate: "120",
          weekendRate: "180",
          weeklyRate: "700",
          createdAt: null,
        },
      ]);

      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 12));
      expect(result.totalAmount).toBe(700);
      expect(result.weekdayCount).toBe(5);
      expect(result.weekendCount).toBe(2);
    });

    it("7 days with seasonal daily rate only (no weekly) = sum of daily seasonal rates", async () => {
      // Mon Jan 6 – Sun Jan 12, 2025
      mockedGetSeasonalRates.mockResolvedValue([
        {
          id: 11,
          siteId: 1,
          name: "Peak",
          startDate: "2025-01-01",
          endDate: "2025-01-31",
          weekdayRate: "120",
          weekendRate: "180",
          weeklyRate: null,
          createdAt: null,
        },
      ]);

      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 12));
      // 5 weekdays × 120 + 2 weekends × 180
      expect(result.totalAmount).toBe(5 * 120 + 2 * 180); // 960
    });

    it("14 days with seasonal weekly rate = 2 × seasonal weekly rate", async () => {
      // Mon Jan 6 – Sun Jan 19, 2025
      mockedGetSeasonalRates.mockResolvedValue([
        {
          id: 12,
          siteId: 1,
          name: "Summer",
          startDate: "2025-01-01",
          endDate: "2025-01-31",
          weekdayRate: "120",
          weekendRate: "180",
          weeklyRate: "700",
          createdAt: null,
        },
      ]);

      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 19));
      expect(result.totalAmount).toBe(2 * 700); // 1400
    });
  });

  // ───────────────────────────────────────────────────
  // Cross-boundary bookings
  // ───────────────────────────────────────────────────

  describe("Cross-boundary bookings", () => {
    it("Example 1: 7 normal + 3 seasonal + 4 normal", async () => {
      // Mon Jan 6 – Sun Jan 19, 2025 (14 days)
      // Christmas seasonal covers Mon Jan 13 – Wed Jan 15 only
      // No seasonal weekly rate
      mockedGetSeasonalRates.mockResolvedValue([
        {
          id: 20,
          siteId: 1,
          name: "Christmas",
          startDate: "2025-01-13",
          endDate: "2025-01-15",
          weekdayRate: "200",
          weekendRate: "250",
          weeklyRate: null,
          createdAt: null,
        },
      ]);

      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 19));

      // Segment 1: Mon 6 – Sun 12 (7 days, base) → weekly rate = 600
      // Segment 2: Mon 13 – Wed 15 (3 days, seasonal, no weekly) → 3 × 200 = 600
      // Segment 3: Thu 16 – Sun 19 (4 days, base, <7 no weekly)
      //   Thu 16 (weekday 100), Fri 17 (weekday 100), Sat 18 (weekend 150), Sun 19 (weekend 150)
      //   = 200 + 300 = 500
      expect(result.totalAmount).toBe(600 + 600 + 500); // 1700
      expect(result.weekdayCount).toBe(10);
      expect(result.weekendCount).toBe(4);
    });

    it("Example 2: 7 seasonal with weekly + 7 normal with weekly", async () => {
      // Mon Jan 6 – Sun Jan 19, 2025 (14 days)
      // Easter seasonal covers Mon Jan 6 – Sun Jan 12 with weekly and daily rates
      mockedGetSeasonalRates.mockResolvedValue([
        {
          id: 21,
          siteId: 1,
          name: "Easter",
          startDate: "2025-01-06",
          endDate: "2025-01-12",
          weekdayRate: "130",
          weekendRate: "190",
          weeklyRate: "800",
          createdAt: null,
        },
      ]);

      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 19));

      // Segment 1: Mon 6 – Sun 12 (7 days, Easter) → seasonal weekly = 800
      // Segment 2: Mon 13 – Sun 19 (7 days, base) → normal weekly = 600
      expect(result.totalAmount).toBe(800 + 600); // 1400
    });

    it("seasonal in the middle of normal segments", async () => {
      // Mon Jan 6 – Sun Jan 26, 2025 (21 days)
      // Seasonal covers Wed Jan 15 – Fri Jan 17 (3 days)
      mockedGetSeasonalRates.mockResolvedValue([
        {
          id: 22,
          siteId: 1,
          name: "Special",
          startDate: "2025-01-15",
          endDate: "2025-01-17",
          weekdayRate: "200",
          weekendRate: null,
          weeklyRate: null,
          createdAt: null,
        },
      ]);

      const result = await calculateBookingCost(site, utc(2025, 0, 6), utc(2025, 0, 26));

      // Segment 1: Mon 6 – Tue 14 (9 days, base)
      //   7 days at weekly (600) + 2 remaining: Mon 13 (100), Tue 14 (100) = 200
      // Segment 2: Wed 15 – Fri 17 (3 days, seasonal, no weekly)
      //   3 × 200 = 600 (weekdayRate used for all since weekendRate is null)
      // Segment 3: Sat 18 – Sun 26 (9 days, base)
      //   7 days at weekly (600) + 2 remaining: Sat 25 (150), Sun 26 (150) = 300
      expect(result.totalAmount).toBe(600 + 200 + 600 + 600 + 300); // 2300
    });
  });
});
