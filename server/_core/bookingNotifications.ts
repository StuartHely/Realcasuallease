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


/**
 * Email notification for Vacant Shop enquiries
 */
export async function sendVacantShopEnquiryEmail(
  shopName: string,
  customerName: string,
  customerEmail: string,
  centreName: string,
  startDate: Date,
  endDate: Date,
  message: string
): Promise<boolean> {
  try {
    const startDateStr = new Date(startDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const endDateStr = new Date(endDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailContent = `
Dear ${customerName},

Thank you for your enquiry about the Vacant Shop at ${centreName}.

**Shop Details:**
- Shop: ${shopName}
- Location: ${centreName}
- Requested Dates: ${startDateStr} to ${endDateStr}

**Your Message:**
${message || "No additional message provided"}

We have received your enquiry and will get back to you shortly with availability and pricing information.

Best regards,
Real Casual Leasing Team
    `.trim();

    await notifyOwner({
      title: `New Vacant Shop Enquiry: ${shopName} at ${centreName}`,
      content: `Customer: ${customerEmail}\n\n${emailContent}`,
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send VS enquiry email:", error);
    return false;
  }
}

/**
 * Email notification for Third Line Income enquiries
 */
export async function sendThirdLineEnquiryEmail(
  assetName: string,
  category: string,
  customerName: string,
  customerEmail: string,
  centreName: string,
  startDate: Date,
  endDate: Date,
  message: string
): Promise<boolean> {
  try {
    const startDateStr = new Date(startDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const endDateStr = new Date(endDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailContent = `
Dear ${customerName},

Thank you for your enquiry about the ${category} at ${centreName}.

**Asset Details:**
- Asset: ${assetName}
- Category: ${category}
- Location: ${centreName}
- Requested Dates: ${startDateStr} to ${endDateStr}

**Your Message:**
${message || "No additional message provided"}

We have received your enquiry and will get back to you shortly with availability and pricing information.

Best regards,
Real Casual Leasing Team
    `.trim();

    await notifyOwner({
      title: `New Third Line Enquiry: ${assetName} (${category}) at ${centreName}`,
      content: `Customer: ${customerEmail}\n\n${emailContent}`,
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send 3rdL enquiry email:", error);
    return false;
  }
}

/**
 * Send VS/3rdL booking confirmation email
 */
export async function sendVSThirdLineConfirmationEmail(
  assetType: 'vacant_shop' | 'third_line',
  assetName: string,
  customerName: string,
  customerEmail: string,
  centreName: string,
  startDate: Date,
  endDate: Date,
  totalAmount: string | number,
  category?: string
): Promise<boolean> {
  try {
    const startDateStr = new Date(startDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const endDateStr = new Date(endDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const assetTypeLabel = assetType === 'vacant_shop' ? 'Vacant Shop' : 'Third Line Income';

    const emailContent = `
Dear ${customerName},

Great news! Your ${assetTypeLabel} booking has been approved and confirmed.

**Booking Details:**
- Asset: ${assetName}
- Location: ${centreName}
${category ? `- Category: ${category}` : ''}
- Dates: ${startDateStr} to ${endDateStr}
- Total Amount: $${Number(totalAmount).toFixed(2)}

Your booking is now confirmed. Please contact the shopping centre management for check-in details.

If you have any questions, please contact us.

Best regards,
Real Casual Leasing Team
    `.trim();

    await notifyOwner({
      title: `${assetTypeLabel} Booking Confirmed: ${assetName}`,
      content: `Customer: ${customerEmail}\n\n${emailContent}`,
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send confirmation email:", error);
    return false;
  }
}

/**
 * Send VS/3rdL booking rejection email
 */
export async function sendVSThirdLineRejectionEmail(
  assetType: 'vacant_shop' | 'third_line',
  assetName: string,
  customerName: string,
  customerEmail: string,
  centreName: string,
  startDate: Date,
  endDate: Date,
  rejectionReason: string,
  category?: string
): Promise<boolean> {
  try {
    const startDateStr = new Date(startDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const endDateStr = new Date(endDate).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const assetTypeLabel = assetType === 'vacant_shop' ? 'Vacant Shop' : 'Third Line Income';

    const emailContent = `
Dear ${customerName},

We regret to inform you that your ${assetTypeLabel} booking request has been declined.

**Booking Details:**
- Asset: ${assetName}
- Location: ${centreName}
${category ? `- Category: ${category}` : ''}
- Dates: ${startDateStr} to ${endDateStr}

**Reason for Rejection:**
${rejectionReason}

We apologize for any inconvenience. Please feel free to search for alternative spaces or contact us if you have any questions.

Best regards,
Real Casual Leasing Team
    `.trim();

    await notifyOwner({
      title: `${assetTypeLabel} Booking Rejected: ${assetName}`,
      content: `Customer: ${customerEmail}\n\n${emailContent}`,
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send rejection email:", error);
    return false;
  }
}
