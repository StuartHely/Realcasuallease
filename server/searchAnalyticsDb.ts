import { getDb } from "./db";
import { searchAnalytics, type InsertSearchAnalytics } from "../drizzle/schema";
import { sql, desc, eq, and, gte, lte, count } from "drizzle-orm";

/**
 * Log a search query for analytics
 */
export async function logSearch(params: {
  userId?: number;
  query: string;
  centreName?: string;
  minSizeM2?: number;
  productCategory?: string;
  resultsCount: number;
  suggestionsShown?: number;
  searchDate: Date;
  ipAddress?: string;
  parsedIntent?: Record<string, unknown>;
  parserUsed?: string;
  topResultScore?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(searchAnalytics).values({
    userId: params.userId,
    query: params.query,
    centreName: params.centreName,
    minSizeM2: params.minSizeM2 ? params.minSizeM2.toString() : undefined,
    productCategory: params.productCategory,
    resultsCount: params.resultsCount,
    hadResults: params.resultsCount > 0,
    suggestionsShown: params.suggestionsShown || 0,
    suggestionClicked: false,
    searchDate: params.searchDate,
    ipAddress: params.ipAddress,
    parsedIntent: params.parsedIntent,
    parserUsed: params.parserUsed,
    topResultScore: params.topResultScore,
  });
}

/**
 * Log when a user clicks on a search suggestion
 */
export async function logSuggestionClick(params: {
  userId?: number;
  originalQuery: string;
  clickedSuggestion: string;
  ipAddress?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Find the most recent search with this query
  const recentSearch = await db
    .select()
    .from(searchAnalytics)
    .where(eq(searchAnalytics.query, params.originalQuery))
    .orderBy(desc(searchAnalytics.createdAt))
    .limit(1);
  
  if (recentSearch.length > 0) {
    // Update the existing record
    await db
      .update(searchAnalytics)
      .set({
        suggestionClicked: true,
        clickedSuggestion: params.clickedSuggestion,
      })
      .where(eq(searchAnalytics.id, recentSearch[0]!.id));
  }
}

/**
 * Get popular searches (top N by frequency)
 */
export async function getPopularSearches(params: {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<Array<{ query: string; count: number; avgResultsCount: number }>> {
  const db = await getDb();
  if (!db) return [];
  const { limit = 10, startDate, endDate } = params;
  
  let conditions = [];
  if (startDate) {
    conditions.push(gte(searchAnalytics.searchDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(searchAnalytics.searchDate, endDate));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const results = await db
    .select({
      query: searchAnalytics.query,
      count: count(searchAnalytics.id),
      avgResultsCount: sql<number>`AVG(${searchAnalytics.resultsCount})`,
    })
    .from(searchAnalytics)
    .where(whereClause)
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count(searchAnalytics.id)))
    .limit(limit);
  
  return results.map(r => ({
    query: r.query,
    count: Number(r.count),
    avgResultsCount: Math.round(Number(r.avgResultsCount)),
  }));
}

/**
 * Get failed searches (searches with zero results)
 */
export async function getFailedSearches(params: {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<Array<{ query: string; count: number; lastSearched: Date }>> {
  const db = await getDb();
  if (!db) return [];
  const { limit = 10, startDate, endDate } = params;
  
  let conditions = [eq(searchAnalytics.hadResults, false)];
  if (startDate) {
    conditions.push(gte(searchAnalytics.searchDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(searchAnalytics.searchDate, endDate));
  }
  
  const results = await db
    .select({
      query: searchAnalytics.query,
      count: count(searchAnalytics.id),
      lastSearched: sql<Date>`MAX(${searchAnalytics.createdAt})`,
    })
    .from(searchAnalytics)
    .where(and(...conditions))
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count(searchAnalytics.id)))
    .limit(limit);
  
  return results.map(r => ({
    query: r.query,
    count: Number(r.count),
    lastSearched: new Date(r.lastSearched),
  }));
}

/**
 * Get suggestion click-through rate
 */
export async function getSuggestionClickThroughRate(params: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalSearchesWithSuggestions: number;
  totalClicks: number;
  clickThroughRate: number;
}> {
  const db = await getDb();
  if (!db) return { totalSearchesWithSuggestions: 0, totalClicks: 0, clickThroughRate: 0 };
  const { startDate, endDate } = params;
  
  let conditions = [sql`${searchAnalytics.suggestionsShown} > 0`];
  if (startDate) {
    conditions.push(gte(searchAnalytics.searchDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(searchAnalytics.searchDate, endDate));
  }
  
  const results = await db
    .select({
      totalSearchesWithSuggestions: count(searchAnalytics.id),
      totalClicks: sql<number>`SUM(CASE WHEN ${searchAnalytics.suggestionClicked} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(searchAnalytics)
    .where(and(...conditions));
  
  const result = results[0];
  const total = Number(result?.totalSearchesWithSuggestions || 0);
  const clicks = Number(result?.totalClicks || 0);
  
  return {
    totalSearchesWithSuggestions: total,
    totalClicks: clicks,
    clickThroughRate: total > 0 ? (clicks / total) * 100 : 0,
  };
}

/**
 * Get search analytics summary
 */
export async function getSearchAnalyticsSummary(params: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  successRate: number;
  avgResultsPerSearch: number;
}> {
  const db = await getDb();
  if (!db) return { totalSearches: 0, successfulSearches: 0, failedSearches: 0, successRate: 0, avgResultsPerSearch: 0 };
  const { startDate, endDate } = params;
  
  let conditions = [];
  if (startDate) {
    conditions.push(gte(searchAnalytics.searchDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(searchAnalytics.searchDate, endDate));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const results = await db
    .select({
      totalSearches: count(searchAnalytics.id),
      successfulSearches: sql<number>`SUM(CASE WHEN ${searchAnalytics.hadResults} = 1 THEN 1 ELSE 0 END)`,
      failedSearches: sql<number>`SUM(CASE WHEN ${searchAnalytics.hadResults} = 0 THEN 1 ELSE 0 END)`,
      avgResultsPerSearch: sql<number>`AVG(${searchAnalytics.resultsCount})`,
    })
    .from(searchAnalytics)
    .where(whereClause);
  
  const result = results[0];
  const total = Number(result?.totalSearches || 0);
  const successful = Number(result?.successfulSearches || 0);
  
  return {
    totalSearches: total,
    successfulSearches: successful,
    failedSearches: Number(result?.failedSearches || 0),
    successRate: total > 0 ? (successful / total) * 100 : 0,
    avgResultsPerSearch: Math.round(Number(result?.avgResultsPerSearch || 0)),
  };
}
