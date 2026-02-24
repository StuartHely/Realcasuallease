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
}

/**
 * Validate that a rate is within acceptable range
 * Must be > 0 and <= 10,000
 */
function isValidRate(rate: string | null | undefined): boolean {
  if (!rate) return false;
  const numRate = parseFloat(rate);
  if (isNaN(numRate)) return false;
  return numRate > 0 && numRate <= 10000;
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

    const hasInvalidRate =
      !isValidRate(site.pricePerDay) ||
      !isValidRate(site.pricePerWeek) ||
      !isValidRate(site.weekendPricePerDay);

    if (hasInvalidRate) {
      alerts.push({
        centreName: centre.name || "Unknown Centre",
        siteName: site.description || `Site ${site.siteNumber}`,
        siteNumber: site.siteNumber || "",
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