/**
 * Search suggestions for "no results" scenarios
 */

import { getDb } from "./db";
import { shoppingCentres } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { stringSimilarity } from "../shared/stringSimilarity.js";

export interface SearchSuggestion {
  type: "similar_name" | "nearby";
  centreName: string;
  centreId: number;
  reason: string;
  similarity?: number;
}

/**
 * Find similar centre names when search returns no results
 * Uses string similarity to suggest centres with similar names
 */
export async function findSimilarCentres(
  searchQuery: string,
  maxSuggestions: number = 3,
  similarityThreshold: number = 0.4
): Promise<SearchSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all visible centres
  const allCentres = await db
    .select()
    .from(shoppingCentres)
    .where(eq(shoppingCentres.includeInMainSite, true));
  
  // Calculate similarity for each centre
  type ScoredCentre = { centre: typeof allCentres[0]; similarity: number };
  const scored: ScoredCentre[] = allCentres.map((centre: typeof allCentres[0]) => {
    const similarity = stringSimilarity(searchQuery, centre.name);
    return {
      centre,
      similarity,
    };
  });
  
  // Filter by threshold and sort by similarity
  const suggestions = scored
    .filter(item => item.similarity >= similarityThreshold)
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, maxSuggestions)
    .map(item => ({
      type: "similar_name" as const,
      centreName: item.centre.name,
      centreId: item.centre.id,
      reason: `Did you mean "${item.centre.name}"?`,
      similarity: item.similarity,
    }));
  
  return suggestions;
}

/**
 * Find nearby centres based on location
 * Returns centres in the same city or state
 */
export async function findNearbyCentres(
  searchQuery: string,
  maxSuggestions: number = 3
): Promise<SearchSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all visible centres
  const allCentres = await db
    .select()
    .from(shoppingCentres)
    .where(eq(shoppingCentres.includeInMainSite, true));
  
  const queryLower = searchQuery.toLowerCase();
  
  // Find centres in cities/suburbs that partially match the query
  const nearbyCentres = allCentres
    .filter((centre: typeof allCentres[0]) => {
      const city = (centre.city || "").toLowerCase();
      const suburb = (centre.suburb || "").toLowerCase();
      const state = (centre.state || "").toLowerCase();
      
      // Check if query matches city, suburb, or state
      return city.includes(queryLower) || 
             suburb.includes(queryLower) || 
             state.includes(queryLower) ||
             queryLower.includes(city) ||
             queryLower.includes(suburb);
    })
    .slice(0, maxSuggestions)
    .map((centre: typeof allCentres[0]) => {
      const location = centre.suburb || centre.city || centre.state;
      const reason = location 
        ? `Try "${centre.name}" in ${location}`
        : `Try "${centre.name}"`;
      return {
        type: "nearby" as const,
        centreName: centre.name,
        centreId: centre.id,
        reason,
      };
    });
  
  return nearbyCentres;
}

/**
 * Get comprehensive search suggestions when no results found
 * Combines similar name suggestions and nearby location suggestions
 */
export async function getSearchSuggestions(
  searchQuery: string,
  maxTotal: number = 5
): Promise<SearchSuggestion[]> {
  // Get both types of suggestions
  const [similarCentres, nearbyCentres] = await Promise.all([
    findSimilarCentres(searchQuery, 3, 0.4),
    findNearbyCentres(searchQuery, 3),
  ]);
  
  // Combine and deduplicate by centre ID
  const seen = new Set<number>();
  const combined: SearchSuggestion[] = [];
  
  // Add similar centres first (higher priority)
  for (const suggestion of similarCentres) {
    if (!seen.has(suggestion.centreId) && combined.length < maxTotal) {
      seen.add(suggestion.centreId);
      combined.push(suggestion);
    }
  }
  
  // Add nearby centres
  for (const suggestion of nearbyCentres) {
    if (!seen.has(suggestion.centreId) && combined.length < maxTotal) {
      seen.add(suggestion.centreId);
      combined.push(suggestion);
    }
  }
  
  return combined;
}
