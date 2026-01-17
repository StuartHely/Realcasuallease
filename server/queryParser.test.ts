import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseSearchQuery } from "../shared/queryParser";

describe("queryParser - date parsing", () => {
  // Mock the current date to ensure consistent test results
  const mockDate = new Date(2026, 0, 17); // January 17, 2026 (Saturday)
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("natural language dates", () => {
    it("should parse 'today'", () => {
      const result = parseSearchQuery("Campbelltown Mall today");
      expect(result.parsedDate).toBe("2026-01-17");
      expect(result.centreName).toContain("Campbelltown");
    });

    it("should parse 'tomorrow'", () => {
      const result = parseSearchQuery("Campbelltown Mall tomorrow");
      expect(result.parsedDate).toBe("2026-01-18");
    });

    it("should parse 'next Monday'", () => {
      const result = parseSearchQuery("Campbelltown Mall next Monday");
      // Jan 17, 2026 is Saturday, next Monday would be Jan 26, 2026 (next week's Monday)
      expect(result.parsedDate).toBe("2026-01-26");
    });

    it("should parse 'this Friday'", () => {
      const result = parseSearchQuery("Campbelltown Mall this Friday");
      // Jan 17, 2026 is Saturday, this Friday would be Jan 23, 2026
      expect(result.parsedDate).toBe("2026-01-23");
    });
  });

  describe("date formats", () => {
    it("should parse '6 June' format", () => {
      const result = parseSearchQuery("Campbelltown Mall from 6 June");
      expect(result.parsedDate).toBe("2026-06-06");
    });

    it("should parse 'June 6' format", () => {
      const result = parseSearchQuery("Campbelltown Mall on June 6");
      expect(result.parsedDate).toBe("2026-06-06");
    });

    it("should parse '6th June' format with ordinal", () => {
      const result = parseSearchQuery("Campbelltown Mall 6th June");
      expect(result.parsedDate).toBe("2026-06-06");
    });

    it("should parse '6/6' Australian DD/MM format", () => {
      const result = parseSearchQuery("Campbelltown Mall 6/6");
      expect(result.parsedDate).toBe("2026-06-06");
    });

    it("should parse '06/06/2026' full date format", () => {
      const result = parseSearchQuery("Campbelltown Mall 06/06/2026");
      expect(result.parsedDate).toBe("2026-06-06");
    });

    it("should parse abbreviated month names", () => {
      const result = parseSearchQuery("Campbelltown Mall 15 Jan");
      // Jan 15 has passed in our mock (Jan 17), so it should be next year
      expect(result.parsedDate).toBe("2027-01-15");
    });
  });

  describe("date ranges", () => {
    it("should parse '6 June to 12 June' range", () => {
      const result = parseSearchQuery("Campbelltown Mall 6 June to 12 June");
      expect(result.parsedDate).toBe("2026-06-06");
      expect(result.dateRangeEnd).toBe("2026-06-12");
    });

    it("should parse '6-12 June' compact range", () => {
      const result = parseSearchQuery("Campbelltown Mall 6-12 June");
      expect(result.parsedDate).toBe("2026-06-06");
      expect(result.dateRangeEnd).toBe("2026-06-12");
    });
  });

  describe("complex queries with dates", () => {
    it("should parse centre, size, category, and date together", () => {
      const result = parseSearchQuery("2x3m fashion at Campbelltown from 6 June");
      expect(result.centreName).toContain("Campbelltown");
      expect(result.minSizeM2).toBe(6); // 2x3 = 6
      expect(result.productCategory).toBe("fashion");
      expect(result.parsedDate).toBe("2026-06-06");
    });

    it("should handle query with date at the end", () => {
      const result = parseSearchQuery("Highlands Marketplace food tomorrow");
      expect(result.centreName).toContain("Highlands");
      expect(result.productCategory).toBe("food");
      expect(result.parsedDate).toBe("2026-01-18");
    });

    it("should handle query with date in the middle", () => {
      const result = parseSearchQuery("Campbelltown Mall 3x3m on 6 June shoes");
      expect(result.centreName).toContain("Campbelltown");
      expect(result.minSizeM2).toBe(9); // 3x3 = 9
      expect(result.parsedDate).toBe("2026-06-06");
    });
  });

  describe("no date in query", () => {
    it("should return undefined parsedDate when no date is specified", () => {
      const result = parseSearchQuery("Campbelltown Mall 3x3m shoes");
      expect(result.parsedDate).toBeUndefined();
      expect(result.centreName).toContain("Campbelltown");
      expect(result.minSizeM2).toBe(9);
    });
  });

  describe("past dates", () => {
    it("should use next year for past dates", () => {
      // Jan 10 has already passed (we're on Jan 17)
      const result = parseSearchQuery("Campbelltown Mall 10 January");
      expect(result.parsedDate).toBe("2027-01-10");
    });

    it("should use current year for future dates", () => {
      // Feb 10 is still in the future
      const result = parseSearchQuery("Campbelltown Mall 10 February");
      expect(result.parsedDate).toBe("2026-02-10");
    });
  });
});
