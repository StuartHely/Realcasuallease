import { describe, it, expect } from "vitest";
import { parseSearchQuery, siteMatchesRequirements } from "../shared/queryParser";

describe("Query Parser", () => {
  describe("parseSearchQuery", () => {
    it("should parse dimension format (3x4m)", () => {
      const result = parseSearchQuery("Highlands Marketplace 3x4m");
      expect(result.centreName).toBe("Highlands Marketplace");
      expect(result.minSizeM2).toBe(12);
      expect(result.minTables).toBeUndefined();
    });

    it("should parse dimension format with spaces (3 x 4m)", () => {
      const result = parseSearchQuery("Campbelltown Mall 3 x 4m");
      expect(result.centreName).toBe("Campbelltown Mall");
      expect(result.minSizeM2).toBe(12);
    });

    it("should parse dimension format with units (3m x 4m)", () => {
      const result = parseSearchQuery("Pacific Square 3m x 4m");
      expect(result.centreName).toBe("Pacific Square");
      expect(result.minSizeM2).toBe(12);
    });

    it("should parse area format (12sqm)", () => {
      const result = parseSearchQuery("Highlands 12sqm");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
    });

    it("should parse area format with space (12 sqm)", () => {
      const result = parseSearchQuery("Campbelltown 12 sqm");
      expect(result.centreName).toBe("Campbelltown");
      expect(result.minSizeM2).toBe(12);
    });

    it("should parse area format (15 square meters)", () => {
      const result = parseSearchQuery("Pacific 15 square meters");
      expect(result.centreName).toBe("Pacific");
      expect(result.minSizeM2).toBe(15);
    });

    it("should parse area format (15m2)", () => {
      const result = parseSearchQuery("Highlands 15m2");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(15);
    });

    it("should parse table requirement (5 tables)", () => {
      const result = parseSearchQuery("Campbelltown Mall 5 tables");
      expect(result.centreName).toBe("Campbelltown Mall");
      expect(result.minTables).toBe(5);
      expect(result.minSizeM2).toBeUndefined();
    });

    it("should parse table requirement (3 trestle tables)", () => {
      const result = parseSearchQuery("Highlands 3 trestle tables");
      expect(result.centreName).toBe("Highlands");
      expect(result.minTables).toBe(3);
    });

    it("should parse combined size and table requirements", () => {
      const result = parseSearchQuery("Campbelltown 3x4m 5 tables");
      expect(result.centreName).toBe("Campbelltown");
      expect(result.minSizeM2).toBe(12);
      expect(result.minTables).toBe(5);
    });

    it("should handle query with no requirements", () => {
      const result = parseSearchQuery("Highlands Marketplace");
      expect(result.centreName).toBe("Highlands Marketplace");
      expect(result.minSizeM2).toBeUndefined();
      expect(result.minTables).toBeUndefined();
    });

    it("should handle decimal dimensions (3.5x4m)", () => {
      const result = parseSearchQuery("Pacific 3.5x4m");
      expect(result.centreName).toBe("Pacific");
      expect(result.minSizeM2).toBe(14);
    });

    it("should handle case insensitive (3X4M)", () => {
      const result = parseSearchQuery("Highlands 3X4M");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
    });
  });

  describe("siteMatchesRequirements", () => {
    it("should match site with sufficient size", () => {
      const site = { size: "4m x 4m", maxTables: null };
      const requirements = parseSearchQuery("Highlands 3x4m");
      expect(siteMatchesRequirements(site, requirements)).toBe(true);
    });

    it("should not match site with insufficient size", () => {
      const site = { size: "2m x 3m", maxTables: null };
      const requirements = parseSearchQuery("Highlands 3x4m");
      expect(siteMatchesRequirements(site, requirements)).toBe(false);
    });

    it("should match site with sufficient tables", () => {
      const site = { size: null, maxTables: 6 };
      const requirements = parseSearchQuery("Highlands 5 tables");
      expect(siteMatchesRequirements(site, requirements)).toBe(true);
    });

    it("should not match site with insufficient tables", () => {
      const site = { size: null, maxTables: 3 };
      const requirements = parseSearchQuery("Highlands 5 tables");
      expect(siteMatchesRequirements(site, requirements)).toBe(false);
    });

    it("should match site meeting both requirements", () => {
      const site = { size: "4m x 4m", maxTables: 6 };
      const requirements = parseSearchQuery("Highlands 3x4m 5 tables");
      expect(siteMatchesRequirements(site, requirements)).toBe(true);
    });

    it("should not match if one requirement fails", () => {
      const site = { size: "4m x 4m", maxTables: 3 };
      const requirements = parseSearchQuery("Highlands 3x4m 5 tables");
      expect(siteMatchesRequirements(site, requirements)).toBe(false);
    });

    it("should match site with no requirements specified", () => {
      const site = { size: "3m x 3m", maxTables: 2 };
      const requirements = parseSearchQuery("Highlands");
      expect(siteMatchesRequirements(site, requirements)).toBe(true);
    });

    it("should handle site size in sqm format", () => {
      const site = { size: "15sqm", maxTables: null };
      const requirements = parseSearchQuery("Highlands 12sqm");
      expect(siteMatchesRequirements(site, requirements)).toBe(true);
    });

    it("should handle site size without units", () => {
      const site = { size: "3 x 4", maxTables: null };
      const requirements = parseSearchQuery("Highlands 10sqm");
      expect(siteMatchesRequirements(site, requirements)).toBe(true);
    });
  });
});
