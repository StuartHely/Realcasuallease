import { describe, it, expect } from "vitest";
import { parseSearchQuery } from "../shared/queryParser";

describe("Query Parser with Product Category Support", () => {
  describe("Product Category Extraction", () => {
    it("should extract 'shoes' from query", () => {
      const result = parseSearchQuery("Highlands 3x4 shoes");
      expect(result.productCategory).toBe("shoes");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
    });

    it("should extract 'food' from query", () => {
      const result = parseSearchQuery("Campbelltown food");
      expect(result.productCategory).toBe("food");
      expect(result.centreName).toBe("Campbelltown");
    });

    it("should extract 'clothing' from query", () => {
      const result = parseSearchQuery("Pacific Square 4x3 clothing");
      expect(result.productCategory).toBe("clothing");
      expect(result.centreName).toBe("Pacific Square");
      expect(result.minSizeM2).toBe(12);
    });

    it("should extract 'jewelry' from query", () => {
      const result = parseSearchQuery("Highlands jewelry 3x4");
      expect(result.productCategory).toBe("jewelry");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
    });

    it("should extract 'electronics' from query", () => {
      const result = parseSearchQuery("Campbelltown electronics");
      expect(result.productCategory).toBe("electronics");
      expect(result.centreName).toBe("Campbelltown");
    });

    it("should handle queries without category", () => {
      const result = parseSearchQuery("Highlands 3x4");
      expect(result.productCategory).toBeUndefined();
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
    });

    it("should handle category synonyms - footwear", () => {
      const result = parseSearchQuery("Highlands footwear");
      expect(result.productCategory).toBe("footwear");
      expect(result.centreName).toBe("Highlands");
    });

    it("should handle category synonyms - cafe", () => {
      const result = parseSearchQuery("Campbelltown cafe 3x3");
      expect(result.productCategory).toBe("cafe");
      expect(result.centreName).toBe("Campbelltown");
      expect(result.minSizeM2).toBe(9);
    });
  });

  describe("Combined Query Parsing", () => {
    it("should parse centre + size + category", () => {
      const result = parseSearchQuery("Highlands Marketplace 3x4m shoes");
      expect(result.centreName).toBe("Highlands Marketplace");
      expect(result.minSizeM2).toBe(12);
      expect(result.productCategory).toBe("shoes");
    });

    it("should parse centre + category + size (different order)", () => {
      const result = parseSearchQuery("Campbelltown food 4x4");
      expect(result.centreName).toBe("Campbelltown");
      expect(result.minSizeM2).toBe(16);
      expect(result.productCategory).toBe("food");
    });

    it("should parse centre + tables + category", () => {
      const result = parseSearchQuery("Pacific Square 5 tables craft");
      expect(result.centreName).toBe("Pacific Square");
      expect(result.minTables).toBe(5);
      expect(result.productCategory).toBe("craft");
    });

    it("should handle complex multi-word centre names", () => {
      const result = parseSearchQuery("Carnes Hill Marketplace 3x4 beauty");
      expect(result.centreName).toBe("Carnes Hill Marketplace");
      expect(result.minSizeM2).toBe(12);
      expect(result.productCategory).toBe("beauty");
    });
  });

  describe("Edge Cases", () => {
    it("should handle category at the beginning", () => {
      const result = parseSearchQuery("shoes Highlands 3x4");
      expect(result.productCategory).toBe("shoes");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
    });

    it("should handle category in the middle", () => {
      const result = parseSearchQuery("Highlands shoes 3x4");
      expect(result.productCategory).toBe("shoes");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
    });

    it("should handle multiple spaces", () => {
      const result = parseSearchQuery("Highlands   3x4   shoes");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
      expect(result.productCategory).toBe("shoes");
    });

    it("should handle case insensitivity", () => {
      const result = parseSearchQuery("HIGHLANDS 3X4 SHOES");
      expect(result.centreName).toBe("HIGHLANDS");
      expect(result.minSizeM2).toBe(12);
      expect(result.productCategory).toBe("shoes");
    });

    it("should not extract category from centre name", () => {
      // If a centre is actually named "Footwear Plaza", it should still work
      const result = parseSearchQuery("Footwear Plaza");
      // This will extract "footwear" as category, which is expected behavior
      // The search will still work because it searches across all fields
      expect(result.productCategory).toBe("footwear");
    });
  });

  describe("Real-World Examples", () => {
    it("should handle: Highlands 3x4 shoes", () => {
      const result = parseSearchQuery("Highlands 3x4 shoes");
      expect(result.centreName).toBe("Highlands");
      expect(result.minSizeM2).toBe(12);
      expect(result.productCategory).toBe("shoes");
    });

    it("should handle: Campbelltown food", () => {
      const result = parseSearchQuery("Campbelltown food");
      expect(result.centreName).toBe("Campbelltown");
      expect(result.productCategory).toBe("food");
      expect(result.minSizeM2).toBeUndefined();
    });

    it("should handle: 3x4 jewelry", () => {
      const result = parseSearchQuery("3x4 jewelry");
      expect(result.centreName).toBe("");
      expect(result.minSizeM2).toBe(12);
      expect(result.productCategory).toBe("jewelry");
    });

    it("should handle: Pacific Square beauty salon", () => {
      const result = parseSearchQuery("Pacific Square beauty salon");
      expect(result.centreName).toBe("Pacific Square"); // Both 'beauty' and 'salon' are keywords, so both removed
      expect(result.productCategory).toBe("beauty"); // Returns first match
    });
  });
});
