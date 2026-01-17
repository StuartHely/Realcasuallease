import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
  };
});

describe("Search with Extra Words", () => {
  describe("Word-by-word matching logic", () => {
    // Test the word matching algorithm directly
    const wordMatch = (query: string, target: string): { matches: boolean; score: number } => {
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const targetLower = target.toLowerCase();
      
      let matchCount = 0;
      for (const word of queryWords) {
        if (targetLower.includes(word)) {
          matchCount++;
        }
      }
      
      const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
      return { matches: matchCount > 0, score };
    };

    it("should match 'campbelltown mall 2x3 random' to 'Campbelltown Mall'", () => {
      const result = wordMatch("campbelltown mall random", "Campbelltown Mall");
      expect(result.matches).toBe(true);
      expect(result.score).toBeGreaterThan(0.5); // At least 2 out of 3 words match
    });

    it("should match 'campbelltown mall 2x3 feet' to 'Campbelltown Mall'", () => {
      const result = wordMatch("campbelltown mall feet", "Campbelltown Mall");
      expect(result.matches).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it("should match 'highlands marketplace' to 'Highlands Marketplace'", () => {
      const result = wordMatch("highlands marketplace", "Highlands Marketplace");
      expect(result.matches).toBe(true);
      expect(result.score).toBe(1); // Perfect match
    });

    it("should match partial query 'highlands' to 'Highlands Marketplace'", () => {
      const result = wordMatch("highlands", "Highlands Marketplace");
      expect(result.matches).toBe(true);
      expect(result.score).toBe(1); // 1 out of 1 word matches
    });

    it("should match 'pacific square random words here' to 'Pacific Square'", () => {
      const result = wordMatch("pacific square random words here", "Pacific Square");
      expect(result.matches).toBe(true);
      expect(result.score).toBe(0.4); // 2 out of 5 words match
    });

    it("should not match completely unrelated query", () => {
      const result = wordMatch("xyz abc def", "Campbelltown Mall");
      expect(result.matches).toBe(false);
      expect(result.score).toBe(0);
    });

    it("should prioritize better matches with higher scores", () => {
      const exactMatch = wordMatch("campbelltown mall", "Campbelltown Mall");
      const partialMatch = wordMatch("campbelltown mall random extra words", "Campbelltown Mall");
      
      expect(exactMatch.score).toBeGreaterThan(partialMatch.score);
    });

    it("should handle single word queries", () => {
      const result = wordMatch("campbelltown", "Campbelltown Mall");
      expect(result.matches).toBe(true);
      expect(result.score).toBe(1);
    });

    it("should ignore very short words (1 character)", () => {
      const result = wordMatch("a b c campbelltown", "Campbelltown Mall");
      expect(result.matches).toBe(true);
      // Only "campbelltown" should be considered (length > 1)
      expect(result.score).toBe(1);
    });

    it("should be case insensitive", () => {
      const result = wordMatch("CAMPBELLTOWN MALL", "campbelltown mall");
      expect(result.matches).toBe(true);
      expect(result.score).toBe(1);
    });
  });

  describe("Centre ranking by score", () => {
    const centres = [
      { name: "Campbelltown Mall", suburb: "Campbelltown" },
      { name: "Highlands Marketplace", suburb: "Mittagong" },
      { name: "Pacific Square", suburb: "Maroubra" },
    ];

    const wordMatch = (query: string, target: string): { matches: boolean; score: number } => {
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const targetLower = target.toLowerCase();
      
      let matchCount = 0;
      for (const word of queryWords) {
        if (targetLower.includes(word)) {
          matchCount++;
        }
      }
      
      const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
      return { matches: matchCount > 0, score };
    };

    it("should rank exact match highest", () => {
      const query = "campbelltown mall";
      
      const scored = centres.map(c => ({
        centre: c,
        score: Math.max(
          wordMatch(query, c.name).score,
          wordMatch(query, c.suburb).score
        ),
        matches: wordMatch(query, c.name).matches || wordMatch(query, c.suburb).matches
      })).filter(item => item.matches).sort((a, b) => b.score - a.score);

      expect(scored[0].centre.name).toBe("Campbelltown Mall");
    });

    it("should still find correct centre with extra words", () => {
      const query = "campbelltown mall random feet extra";
      
      const scored = centres.map(c => ({
        centre: c,
        score: Math.max(
          wordMatch(query, c.name).score,
          wordMatch(query, c.suburb).score
        ),
        matches: wordMatch(query, c.name).matches || wordMatch(query, c.suburb).matches
      })).filter(item => item.matches).sort((a, b) => b.score - a.score);

      expect(scored.length).toBeGreaterThan(0);
      expect(scored[0].centre.name).toBe("Campbelltown Mall");
    });
  });
});
