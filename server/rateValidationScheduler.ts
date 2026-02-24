/**
 * Rate Validation Scheduler
 * Runs daily rate checks at 2 AM
 */

import cron from "node-cron";
import { checkSiteRates } from "./rateValidator";

let isRunning = false;

/**
 * Initialize the rate validation scheduler
 * Runs daily at 2:00 AM
 */
export function startRateValidationScheduler() {
  console.log("[Rate Validation Scheduler] Starting...");

  // Run daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    if (isRunning) {
      console.log("[Rate Validation Scheduler] Previous check still running, skipping");
      return;
    }

    isRunning = true;
    console.log(`[Rate Validation Scheduler] Running at ${new Date().toISOString()}`);

    try {
      await checkSiteRates();
      console.log("[Rate Validation Scheduler] Completed successfully");
    } catch (error) {
      console.error("[Rate Validation Scheduler] Error:", error);
    } finally {
      isRunning = false;
    }
  });

  console.log("[Rate Validation Scheduler] Scheduled to run daily at 2:00 AM");

  // Run once on startup
  setTimeout(async () => {
    console.log("[Rate Validation Scheduler] Running initial check...");
    try {
      await checkSiteRates();
    } catch (error) {
      console.error("[Rate Validation Scheduler] Initial check error:", error);
    }
  }, 5000); // Wait 5 seconds after startup
}