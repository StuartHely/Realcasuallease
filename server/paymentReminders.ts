import { sendEmail } from './_core/email';
import { getDb } from './db';
import { bookings, sites, shoppingCentres, users } from '../drizzle/schema';
import { eq, and, lt, gte, isNull } from 'drizzle-orm';

/**
 * Check for invoices that need payment reminders and send emails
 * Reminder schedule:
 * - 7 days after due date (1st reminder)
 * - 14 days after due date (2nd reminder)
 * - 30 days after due date (3rd reminder)
 */
export async function sendPaymentReminders(): Promise<{
  sent: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) {
    console.error('[Payment Reminders] Database not available');
    return { sent: 0, failed: 0 };
  }

  const now = new Date();
  let sentCount = 0;
  let failedCount = 0;

  try {
    // Get all unpaid invoice bookings with due dates
    const unpaidBookings = await db
      .select({
        bookingId: bookings.id,
        bookingNumber: bookings.bookingNumber,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        totalAmount: bookings.totalAmount,
        gstAmount: bookings.gstAmount,
        paymentDueDate: bookings.paymentDueDate,
        remindersSent: bookings.remindersSent,
        lastReminderSent: bookings.lastReminderSent,
        // Customer info
        customerId: users.id,
        customerName: users.name,
        customerEmail: users.email,
        // Site info
        siteNumber: sites.siteNumber,
        // Centre info
        centreName: shoppingCentres.name,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.customerId, users.id))
      .innerJoin(sites, eq(bookings.siteId, sites.id))
      .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
      .where(
        and(
          eq(bookings.paymentMethod, 'invoice'),
          isNull(bookings.paidAt)
        )
      );

    for (const booking of unpaidBookings) {
      if (!booking.paymentDueDate || !booking.customerEmail) {
        continue;
      }

      const dueDate = new Date(booking.paymentDueDate);

      // Calculate days overdue (negative means not due yet)
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Skip if not overdue yet
      if (daysOverdue < 0) {
        continue;
      }

      // Reminder intervals: 7, 14, 30 days after due date
      const REMINDER_INTERVALS = [7, 14, 30];
      const remindersSent = booking.remindersSent || 0;

      // Determine if we should send a reminder
      let shouldSend = false;
      let reminderNumber = 0;

      // Check if days overdue matches any interval and we haven't sent that reminder yet
      for (let i = 0; i < REMINDER_INTERVALS.length; i++) {
        if (daysOverdue >= REMINDER_INTERVALS[i] && remindersSent <= i) {
          shouldSend = true;
          reminderNumber = i + 1;
          break;
        }
      }

      if (!shouldSend) {
        continue;
      }

      // Check if we already sent a reminder recently (within 24 hours)
      const lastReminder = booking.lastReminderSent ? new Date(booking.lastReminderSent) : null;
      const hoursSinceLastReminder = lastReminder
        ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60)
        : 999;

      if (hoursSinceLastReminder < 24) {
        // Skip if we sent a reminder in the last 24 hours
        continue;
      }

      // Send reminder email
      const sent = await sendReminderEmail(booking, reminderNumber, daysOverdue, dueDate);

      if (sent) {
        // Update reminder count and last sent timestamp
        await db
          .update(bookings)
          .set({ 
            remindersSent: reminderNumber,
            lastReminderSent: now 
          })
          .where(eq(bookings.id, booking.bookingId));
        
        sentCount++;
        console.log(`[Payment Reminders] Sent reminder #${reminderNumber} for booking ${booking.bookingNumber} (${daysOverdue} days overdue)`);
      } else {
        failedCount++;
        console.error(`[Payment Reminders] Failed to send reminder for booking ${booking.bookingNumber}`);
      }
    }

    console.log(`[Payment Reminders] Completed: ${sentCount} sent, ${failedCount} failed`);
    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('[Payment Reminders] Error:', error);
    return { sent: sentCount, failed: failedCount };
  }
}

/**
 * Send a payment reminder email to customer
 */
async function sendReminderEmail(
  booking: any,
  reminderNumber: number,
  daysOverdue: number,
  dueDate: Date
): Promise<boolean> {
  const dueDateStr = dueDate.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const totalAmount = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(Number(booking.totalAmount) + Number(booking.gstAmount));

  const startDate = new Date(booking.startDate).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const endDate = new Date(booking.endDate).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Customize message based on reminder number and days overdue
  const subject = `Payment Reminder #${reminderNumber}: Invoice ${booking.bookingNumber} - ${daysOverdue} Days Overdue`;
  const urgencyMessage = `Your payment is now <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</strong>. Please pay immediately to avoid late fees.`;
  const urgencyColor = reminderNumber === 1 ? '#ff9800' : reminderNumber === 2 ? '#f44336' : '#b71c1c'; // Orange -> Red -> Dark Red

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #123047;">Payment Reminder</h2>
      
      <p>Dear ${booking.customerName || 'Valued Customer'},</p>
      
      <div style="background-color: ${urgencyColor}22; padding: 15px; border-left: 4px solid ${urgencyColor}; margin: 20px 0;">
        <p style="margin: 0; color: #333;">${urgencyMessage}</p>
      </div>
      
      <div style="background-color: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #123047;">Invoice Details</h3>
        <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${booking.bookingNumber}</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> ${booking.centreName}</p>
        <p style="margin: 5px 0;"><strong>Site:</strong> ${booking.siteNumber}</p>
        <p style="margin: 5px 0;"><strong>Dates:</strong> ${startDate} - ${endDate}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${totalAmount}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateStr}</p>
      </div>
      
      <div style="margin: 20px 0;">
        <h4 style="color: #123047;">Payment Details</h4>
        <p style="margin: 5px 0;"><strong>Bank:</strong> [Bank Name]</p>
        <p style="margin: 5px 0;"><strong>BSB:</strong> [BSB Number]</p>
        <p style="margin: 5px 0;"><strong>Account Number:</strong> [Account Number]</p>
        <p style="margin: 5px 0;"><strong>Account Name:</strong> Casual Lease Pty Ltd</p>
        <p style="margin: 5px 0;"><strong>Reference:</strong> ${booking.bookingNumber}</p>
      </div>
      
      <p>Please ensure payment is made by the due date to avoid any late fees or service interruptions.</p>
      
      <p>If you have already made payment, please disregard this reminder.</p>
      
      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Casual Lease Team</strong>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #666;">
        This is an automated reminder. If you have any questions, please contact us.
      </p>
    </div>
  `;

  return await sendEmail({
    to: booking.customerEmail,
    subject,
    html,
  });
}
