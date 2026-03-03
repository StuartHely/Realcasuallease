import { sendEmail } from './_core/email';
import { notifyOwner } from './_core/notification';
import { generateInvoicePDF } from './invoiceGenerator';
import { getBookingById, getSiteById, getShoppingCentreById, getUserById, resolveRemittanceBankAccount } from './db';

/**
 * Send invoice email to customer after booking approval
 */
export async function sendInvoiceEmail(bookingId: number): Promise<boolean> {
  try {
    // Get booking details
    const booking = await getBookingById(bookingId);
    if (!booking) {
      console.error('[Invoice Email] Booking not found:', bookingId);
      return false;
    }

    // Only send invoice for invoice payment method
    if (booking.paymentMethod !== 'invoice') {
      console.log('[Invoice Email] Skipping - not an invoice booking');
      return true;
    }

    // Get related data
    const site = await getSiteById(booking.siteId);
    if (!site) {
      console.error('[Invoice Email] Site not found:', booking.siteId);
      return false;
    }

    const centre = await getShoppingCentreById(site.centreId);
    if (!centre) {
      console.error('[Invoice Email] Centre not found:', site.centreId);
      return false;
    }

    const customer = await getUserById(booking.customerId);
    if (!customer || !customer.email) {
      console.error('[Invoice Email] Customer or email not found:', booking.customerId);
      return false;
    }

    // Resolve bank account — abort if none configured
    const bankAccount = await resolveRemittanceBankAccount(site.centreId);
    if (!bankAccount) {
      console.error('[Invoice Email] No bank account configured for centre:', site.centreId);
      return false;
    }

    // Generate PDF invoice
    const pdfBase64 = await generateInvoicePDF(bookingId);

    // Format dates
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

    // Format currency
    const totalAmount = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(Number(booking.totalAmount));

    // Calculate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    const dueDateStr = dueDate.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Email content
    const subject = `Invoice for Your Booking at ${centre.name}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #123047;">Invoice for Your Booking</h2>
        
        <p>Dear ${customer.name || 'Valued Customer'},</p>
        
        <p>Thank you for your booking! Please find your invoice attached.</p>
        
        <div style="background-color: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #123047;">Booking Details</h3>
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${booking.bookingNumber}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${centre.name}</p>
          <p style="margin: 5px 0;"><strong>Site:</strong> ${site.siteNumber}</p>
          <p style="margin: 5px 0;"><strong>Dates:</strong> ${startDate} - ${endDate}</p>
          <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${totalAmount}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateStr}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">Payment Terms</h4>
          <p style="margin: 5px 0;">Payment is due within <strong>14 days</strong> of invoice date (NET-14).</p>
          <p style="margin: 5px 0;">Please include the invoice number <strong>${booking.bookingNumber}</strong> in your payment reference.</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h4 style="color: #123047;">Payment Details</h4>
          <p style="margin: 5px 0;"><strong>BSB:</strong> ${bankAccount.bankBsb}</p>
          <p style="margin: 5px 0;"><strong>Account Number:</strong> ${bankAccount.bankAccountNumber}</p>
          <p style="margin: 5px 0;"><strong>Account Name:</strong> ${bankAccount.bankAccountName}</p>
        </div>
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>Casual Lease Team</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply directly to this message.
        </p>
      </div>
    `;

    // Send email with PDF attachment to customer
    const sent = await sendEmail({
      to: customer.email,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice-${booking.bookingNumber}.pdf`,
          content: pdfBase64,
          encoding: 'base64',
        },
      ],
    });

    if (sent) {
      console.log('[Invoice Email] Successfully sent invoice to:', customer.email);
    } else {
      // Fallback: notify owner if email fails
      console.warn('[Invoice Email] Email failed, notifying owner instead');
      const notificationContent = `
Invoice Generated for Booking ${booking.bookingNumber}

Customer: ${customer.name} (${customer.email})
Location: ${centre.name} - Site ${site.siteNumber}
Dates: ${startDate} - ${endDate}
Total Amount: ${totalAmount}
Due Date: ${dueDateStr}

Payment Terms: NET-14 days

Note: Email delivery failed. Please send invoice manually to customer.
      `.trim();

      await notifyOwner({
        title: `Invoice Generated (Email Failed): ${booking.bookingNumber}`,
        content: notificationContent,
      });
    }

    return sent;
  } catch (error) {
    console.error('[Invoice Email] Error sending invoice:', error);
    return false;
  }
}
