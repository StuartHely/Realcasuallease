/**
 * Daily Rate Validator
 * Checks all sites for invalid rates and stores alerts
 */

import { getDb } from "./db";
import { sites, shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { setConfigValue, getConfigValue } from "./systemConfigDb";

interface RateAlert {
  centreName: string;
  siteName: string;
  siteNumber: string;
  invalidFields?: string[];
}

/**
 * Validate that a daily rate is within acceptable range
 * Must be > 0 and <= 5,000
 */
function isValidDailyRate(rate: string | null | undefined): boolean {
  if (!rate) return false;
  const numRate = parseFloat(rate);
  if (isNaN(numRate)) return false;
  return numRate > 0 && numRate <= 5000;
}

/**
 * Validate that a weekly rate is within acceptable range
 * Must be > 0 and <= 35,000 (7 × daily cap)
 */
function isValidWeeklyRate(rate: string | null | undefined): boolean {
  if (!rate) return false;
  const numRate = parseFloat(rate);
  if (isNaN(numRate)) return false;
  return numRate > 0 && numRate <= 35000;
}

/**
 * Validate an optional rate — null/undefined is acceptable (fallback applies),
 * but if a value is present it must be a valid daily rate.
 */
function isValidOptionalRate(rate: string | null | undefined): boolean {
  if (rate === null || rate === undefined) return true;
  return isValidDailyRate(rate);
}

/**
 * Check that weekly rate is sensible relative to daily rate.
 * Weekly should be between 3× and 8× the daily rate.
 */
function isWeeklyConsistentWithDaily(daily: string | null | undefined, weekly: string | null | undefined): boolean {
  if (!daily || !weekly) return true;
  const d = parseFloat(daily);
  const w = parseFloat(weekly);
  if (isNaN(d) || isNaN(w) || d <= 0) return true;
  const ratio = w / d;
  return ratio >= 3 && ratio <= 8;
}

/**
 * Check all sites for invalid rates
 * Returns array of sites with rate issues
 */
export async function checkSiteRates(): Promise<RateAlert[]> {
  const db = await getDb();
  if (!db) {
    console.error("[Rate Validator] Database not available");
    return [];
  }

  console.log("[Rate Validator] Starting daily rate check...");

  // Get all active sites with their centres
  const allSites = await db
    .select({
      site: sites,
      centre: shoppingCentres,
    })
    .from(sites)
    .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(eq(sites.isActive, true));

  const alerts: RateAlert[] = [];

  for (const { site, centre } of allSites) {
    if (!centre) continue; // Skip sites without a centre

    const invalidFields: string[] = [];
    if (!isValidDailyRate(site.pricePerDay)) invalidFields.push("pricePerDay");
    if (!isValidWeeklyRate(site.pricePerWeek)) invalidFields.push("pricePerWeek");
    if (!isValidOptionalRate(site.weekendPricePerDay)) invalidFields.push("weekendPricePerDay");
    if (!isWeeklyConsistentWithDaily(site.pricePerDay, site.pricePerWeek)) invalidFields.push("weeklyDailyMismatch");

    if (invalidFields.length > 0) {
      alerts.push({
        centreName: centre.name || "Unknown Centre",
        siteName: site.description || `Site ${site.siteNumber}`,
        siteNumber: site.siteNumber || "",
        invalidFields,
      });
    }
  }

  console.log(`[Rate Validator] Found ${alerts.length} sites with invalid rates`);

  // Store alerts in system config for retrieval
  await setConfigValue("rate_validation_alerts", JSON.stringify(alerts));
  await setConfigValue("rate_validation_last_check", new Date().toISOString());

  return alerts;
}

/**
 * Get current rate validation alerts
 */
export async function getRateValidationAlerts(): Promise<RateAlert[]> {
  const alertsJson = await getConfigValue("rate_validation_alerts");
  if (!alertsJson) return [];
  
  try {
    return JSON.parse(alertsJson);
  } catch (error) {
    console.error("[Rate Validator] Error parsing alerts:", error);
    return [];
  }
}

/**
 * Get timestamp of last rate check
 */
export async function getLastRateCheck(): Promise<string | null> {
  return await getConfigValue("rate_validation_last_check");
}