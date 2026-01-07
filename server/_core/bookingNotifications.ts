import { notifyOwner } from "./notification";

/**
 * Email notification helper for booking status updates
 * Uses the built-in notification API to send emails to customers and owners
 */

interface BookingDetails {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  centreName: string;
  siteNumber: string;
  startDate: Date;
  endDate: Date;
  totalAmount: string | number;
  categoryName?: string;
}

/**
 * Send booking confirmation email to customer
 */
export async function sendBookingConfirmationEmail(booking: BookingDetails): Promise<boolean> {
  try {
    const startDateStr = new Date(booking.startDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const endDateStr = new Date(booking.endDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailContent = `
Dear ${booking.customerName},

Great news! Your booking has been approved and confirmed.

**Booking Details:**
- Booking Number: ${booking.bookingNumber}
- Location: ${booking.centreName} - Site ${booking.siteNumber}
- Dates: ${startDateStr} to ${endDateStr}
${booking.categoryName ? `- Business Category: ${booking.categoryName}` : ""}
- Total Amount: $${Number(booking.totalAmount).toFixed(2)}

Your booking is now confirmed. Please arrive at the site on the start date and check in with the shopping centre management.

If you have any questions, please contact us.

Best regards,
Casual Lease Team
    `.trim();

    // For now, use notifyOwner to send to owner (customer email will be implemented later)
    // In production, this would send directly to customer email
    await notifyOwner({
      title: `Booking Confirmed: ${booking.bookingNumber}`,
      content: `Customer: ${booking.customerEmail}\n\n${emailContent}`,
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send confirmation email:", error);
    return false;
  }
}

/**
 * Send booking rejection email to customer
 */
export async function sendBookingRejectionEmail(
  booking: BookingDetails,
  rejectionReason: string
): Promise<boolean> {
  try {
    const startDateStr = new Date(booking.startDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const endDateStr = new Date(booking.endDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailContent = `
Dear ${booking.customerName},

We regret to inform you that your booking request has been declined.

**Booking Details:**
- Booking Number: ${booking.bookingNumber}
- Location: ${booking.centreName} - Site ${booking.siteNumber}
- Dates: ${startDateStr} to ${endDateStr}
${booking.categoryName ? `- Business Category: ${booking.categoryName}` : ""}

**Reason for Rejection:**
${rejectionReason}

We apologize for any inconvenience. Please feel free to search for alternative spaces or contact us if you have any questions.

Best regards,
Casual Lease Team
    `.trim();

    // For now, use notifyOwner to send to owner (customer email will be implemented later)
    // In production, this would send directly to customer email
    await notifyOwner({
      title: `Booking Rejected: ${booking.bookingNumber}`,
      content: `Customer: ${booking.customerEmail}\n\n${emailContent}`,
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send rejection email:", error);
    return false;
  }
}

/**
 * Send new booking approval request email to owner
 */
export async function sendNewBookingNotificationToOwner(booking: BookingDetails): Promise<boolean> {
  try {
    const startDateStr = new Date(booking.startDate).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    
    const endDateStr = new Date(booking.endDate).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    await notifyOwner({
      title: `New Booking Requires Approval: ${booking.bookingNumber}`,
      content: `
A new booking is pending your approval:

**Customer:** ${booking.customerName} (${booking.customerEmail})
**Location:** ${booking.centreName} - Site ${booking.siteNumber}
**Dates:** ${startDateStr} to ${endDateStr}
${booking.categoryName ? `**Category:** ${booking.categoryName}` : ""}
**Amount:** $${Number(booking.totalAmount).toFixed(2)}

Please review and approve or reject this booking in your dashboard.
      `.trim(),
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send owner notification:", error);
    return false;
  }
}
