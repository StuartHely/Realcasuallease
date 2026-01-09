import cron from 'node-cron';
import { getDb } from './db';
import { shoppingCentres } from '../drizzle/schema';
import { isNotNull } from 'drizzle-orm';
import { sendWeeklyBookingReport, clearReportOverride, getNextReportOverride } from './emailService';

/**
 * Initialize weekly report scheduler
 * Runs every day at 3pm to check if any centres need reports sent
 */
export function initializeReportScheduler() {
  // Run every day at 3:00 PM (we'll check which centres need reports)
  // Cron format: second minute hour day month weekday
  // '0 0 15 * * *' = 3:00 PM every day
  
  cron.schedule('0 0 15 * * *', async () => {
    console.log('[Report Scheduler] Running daily check at 3:00 PM...');
    await checkAndSendReports();
  });

  console.log('[Report Scheduler] Initialized - will run daily at 3:00 PM');
}

/**
 * Check all centres and send reports if needed
 */
async function checkAndSendReports() {
  const db = await getDb();
  if (!db) {
    console.error('[Report Scheduler] Database not available');
    return;
  }

  try {
    // Get all centres that have at least one email configured
    const centres = await db.select().from(shoppingCentres)
      .where(isNotNull(shoppingCentres.weeklyReportEmail1));

    console.log(`[Report Scheduler] Found ${centres.length} centres with email configuration`);

    for (const centre of centres) {
      try {
        // Get current day of week
        const now = new Date();
        const dayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: centre.weeklyReportTimezone || 'Australia/Sydney' });
        const dayOfWeek = dayName.toLowerCase();

        // Check if there's an override for this centre
        const override = await getNextReportOverride(centre.id);
        
        let shouldSend = false;
        
        if (override) {
          // If override is set, send on that day instead of Friday
          shouldSend = dayOfWeek === override;
          console.log(`[Report Scheduler] Centre ${centre.name} has override set to ${override}, current day is ${dayOfWeek}`);
        } else {
          // Default: send on Friday
          shouldSend = dayOfWeek === 'friday';
        }

        if (shouldSend) {
          console.log(`[Report Scheduler] Sending report for ${centre.name}...`);
          
          // Calculate next Monday (week commencing date)
          const nextMonday = getNextMonday(now);
          
          // Send the report
          const result = await sendWeeklyBookingReport(centre.id, nextMonday);
          
          if (result.success) {
            console.log(`[Report Scheduler] ✓ Report sent for ${centre.name}`);
            
            // If this was an override, clear it
            if (override) {
              await clearReportOverride(centre.id);
            }
          } else {
            console.error(`[Report Scheduler] ✗ Failed to send report for ${centre.name}: ${result.message}`);
          }
        }
      } catch (error) {
        console.error(`[Report Scheduler] Error processing centre ${centre.name}:`, error);
      }
    }
  } catch (error) {
    console.error('[Report Scheduler] Error in checkAndSendReports:', error);
  }
}

/**
 * Get the next Monday from a given date
 */
function getNextMonday(from: Date): Date {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day); // If Sunday, next day is Monday; otherwise calculate
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Manual trigger for testing (can be called from admin UI)
 */
export async function triggerWeeklyReport(centreId: number, weekCommencingDate?: Date) {
  const date = weekCommencingDate || getNextMonday(new Date());
  console.log(`[Report Scheduler] Manual trigger for centre ${centreId}, week commencing ${date.toLocaleDateString()}`);
  return await sendWeeklyBookingReport(centreId, date);
}
