import { sendPaymentReminders } from './paymentReminders';

/**
 * Payment Reminder Scheduler
 * Runs daily at 9:00 AM to check for invoices that need reminders
 */

let schedulerInterval: NodeJS.Timeout | null = null;

export function startPaymentReminderScheduler() {
  if (schedulerInterval) {
    console.log('[Payment Reminder Scheduler] Already running');
    return;
  }

  console.log('[Payment Reminder Scheduler] Starting...');

  // Run immediately on startup
  runPaymentReminders();

  // Then run every 24 hours
  schedulerInterval = setInterval(() => {
    runPaymentReminders();
  }, 24 * 60 * 60 * 1000); // 24 hours

  console.log('[Payment Reminder Scheduler] Scheduled to run daily');
}

export function stopPaymentReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Payment Reminder Scheduler] Stopped');
  }
}

async function runPaymentReminders() {
  const now = new Date();
  console.log(`[Payment Reminder Scheduler] Running at ${now.toISOString()}`);
  
  try {
    const result = await sendPaymentReminders();
    console.log(`[Payment Reminder Scheduler] Completed: ${result.sent} sent, ${result.failed} failed`);
  } catch (error) {
    console.error('[Payment Reminder Scheduler] Error:', error);
  }
}
