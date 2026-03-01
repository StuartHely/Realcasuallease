import { generateWeeklyBookingReport, getWeeklyReportRecipients, formatWeeklyReportSubject } from './weeklyReport';
import { getDb } from './db';
import { shoppingCentres } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Send weekly booking report email for a centre
 */
export async function sendWeeklyBookingReport(centreId: number, weekCommencingDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get centre details
  const centreResult = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, centreId)).limit(1);
  const centre = centreResult[0];
  if (!centre) throw new Error(`Centre ${centreId} not found`);

  // Get recipients
  const recipients = await getWeeklyReportRecipients(centreId);
  if (recipients.length === 0) {
    console.log(`[Weekly Report] No recipients configured for centre ${centre.name}`);
    return { success: false, message: 'No recipients configured' };
  }

  // Generate Excel report
  console.log(`[Weekly Report] Generating report for ${centre.name}...`);
  const reportBuffer = await generateWeeklyBookingReport(centreId, weekCommencingDate);

  // Format filename
  const dateStr = `${String(weekCommencingDate.getDate()).padStart(2, '0')}-${String(weekCommencingDate.getMonth() + 1).padStart(2, '0')}-${weekCommencingDate.getFullYear()}`;
  const filename = `${centre.name.replace(/[^a-zA-Z0-9]/g, '_')}_Bookings_${dateStr}.xlsx`;

  // Send email using centralized email service
  const subject = formatWeeklyReportSubject(centre.name, weekCommencingDate);
  const { sendEmail } = await import('./_core/email');

  const sent = await sendEmail({
    to: recipients.join(', '),
    subject: subject,
    html: `
      <p>Please find attached the weekly booking report for <strong>${centre.name}</strong>.</p>
      <p><strong>Week Commencing:</strong> ${weekCommencingDate.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>This report covers 9 consecutive days including the Sunday before and Monday after the requested week.</p>
      <br>
      <p>This is an automated email. Please do not reply.</p>
    `,
    attachments: [
      {
        filename: filename,
        content: Buffer.from(reportBuffer).toString('base64'),
        encoding: 'base64',
      },
    ],
  });

  if (sent) {
    console.log(`[Weekly Report] Email sent successfully to ${recipients.length} recipient(s) for ${centre.name}`);
    return { success: true, message: `Email sent to ${recipients.length} recipient(s)` };
  } else {
    return { success: false, message: 'Failed to send email' };
  }
}

/**
 * Get the next report date for a centre (considering override)
 * Returns null if no override is set (use default Friday 3pm)
 */
export async function getNextReportOverride(centreId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const centreResult = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, centreId)).limit(1);
  const centre = centreResult[0];
  
  return centre?.weeklyReportNextOverrideDay || null;
}

/**
 * Clear the override after sending the report
 */
export async function clearReportOverride(centreId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(shoppingCentres)
    .set({ weeklyReportNextOverrideDay: null })
    .where(eq(shoppingCentres.id, centreId));
  
  console.log(`[Weekly Report] Cleared override for centre ${centreId}`);
}
