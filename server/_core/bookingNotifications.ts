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
  companyName?: string;
  tradingName?: string;
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

    // Use trading name if available, otherwise company name
    const businessName = booking.tradingName || booking.companyName;
    
    const emailContent = `
Dear ${booking.customerName},

Great news! Your booking has been approved and confirmed.

**Booking Details:**
- Booking Number: ${booking.bookingNumber}
${businessName ? `- Business: ${businessName}` : ""}
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

    // Use trading name if available, otherwise company name
    const businessName = booking.tradingName || booking.companyName;
    
    const emailContent = `
Dear ${booking.customerName},

We regret to inform you that your booking request has been declined.

**Booking Details:**
- Booking Number: ${booking.bookingNumber}
${businessName ? `- Business: ${businessName}` : ""}
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

    // Use trading name if available, otherwise company name
    const businessName = booking.tradingName || booking.companyName;
    
    await notifyOwner({
      title: `New Booking Requires Approval: ${booking.bookingNumber}`,
      content: `
A new booking is pending your approval:

**Customer:** ${booking.customerName} (${booking.customerEmail})
${businessName ? `**Business:** ${businessName}` : ""}
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
 * Send payment receipt email to customer after payment is recorded
 */
export async function sendPaymentReceiptEmail(booking: {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  centreName: string;
  siteNumber: string;
  startDate: Date;
  endDate: Date;
  totalAmount: string | number;
  companyName?: string;
  tradingName?: string;
  paidAt: Date;
}): Promise<boolean> {
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

    const paidAtStr = new Date(booking.paidAt).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Use trading name if available, otherwise company name
    const businessName = booking.tradingName || booking.companyName;
    
    const emailContent = `
Dear ${booking.customerName},

Thank you for your payment. This is your receipt for the completed transaction.

**Payment Receipt**
- Receipt Number: ${booking.bookingNumber}
- Payment Date: ${paidAtStr}
- Amount Paid: $${Number(booking.totalAmount).toFixed(2)}

**Booking Details:**
- Booking Number: ${booking.bookingNumber}
${businessName ? `- Business: ${businessName}` : ""}
- Location: ${booking.centreName} - Site ${booking.siteNumber}
- Dates: ${startDateStr} to ${endDateStr}

Your payment has been successfully processed. Please keep this receipt for your records.

If you have any questions, please contact us.

Best regards,
Casual Lease Team
    `.trim();

    await notifyOwner({
      title: `Payment Receipt: ${booking.bookingNumber}`,
      content: `Customer: ${booking.customerEmail}\n\n${emailContent}`,
    });

    return true;
  } catch (error) {
    console.error("[BookingNotifications] Failed to send payment receipt email:", error);
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

/**
 * Send email when booking is rejected due to insurance issues
 */
export async function sendInsuranceRejectionEmail(
  booking: {
    bookingNumber: string;
    customerName: string;
    customerEmail: string;
    centreName: string;
    siteNumber: string;
    startDate: Date;
    endDate: Date;
  },
  insuranceIssues: string[]
): Promise<void> {
  const { sendEmail } = await import('./email');
  
  const issuesList = insuranceIssues.map(issue => `• ${issue}`).join('\n');
  
  const subject = `Action Required: Insurance Issues - Booking ${booking.bookingNumber}`;
  
  const htmlBody = `
    <h2>Insurance Update Required</h2>
    
    <p>Dear ${booking.customerName},</p>
    
    <p>Your booking request <strong>${booking.bookingNumber}</strong> for <strong>${booking.centreName}</strong> 
    has been placed on hold due to the following insurance issues:</p>
    
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
      <strong>Issues Found:</strong><br>
      ${issuesList}
    </div>
    
    <p><strong>What to do next:</strong></p>
    <ol>
      <li>Log in to your account</li>
      <li>Go to "My Bookings"</li>
      <li>Find booking ${booking.bookingNumber}</li>
      <li>Click "Update Insurance"</li>
      <li>Upload a clear, current insurance certificate showing:
        <ul>
          <li>Expiry date (must be valid for at least 6 months)</li>
          <li>Coverage amount ($20 million minimum public liability)</li>
          <li>Policy number</li>
          <li>Insurance company name</li>
        </ul>
      </li>
    </ol>
    
    <p>Once you upload valid insurance, your booking will automatically move back to pending for approval.</p>
    
    <h3>Booking Details:</h3>
    <ul>
      <li><strong>Booking Number:</strong> ${booking.bookingNumber}</li>
      <li><strong>Centre:</strong> ${booking.centreName}</li>
      <li><strong>Site:</strong> ${booking.siteNumber}</li>
      <li><strong>Dates:</strong> ${booking.startDate.toLocaleDateString()} - ${booking.endDate.toLocaleDateString()}</li>
    </ul>
    
    <p>If you have any questions, please contact us.</p>
    
    <p>Best regards,<br>
    The Casual Lease Team</p>
  `;
  
  const textBody = `
Insurance Update Required

Dear ${booking.customerName},

Your booking request ${booking.bookingNumber} for ${booking.centreName} has been placed on hold due to the following insurance issues:

${issuesList}

What to do next:
1. Log in to your account
2. Go to "My Bookings"  
3. Find booking ${booking.bookingNumber}
4. Click "Update Insurance"
5. Upload a clear, current insurance certificate

Required on certificate:
- Expiry date (valid for 6+ months)
- Coverage amount ($20M minimum public liability)
- Policy number
- Insurance company name

Once you upload valid insurance, your booking will automatically move back to pending for approval.

Booking Details:
- Booking Number: ${booking.bookingNumber}
- Centre: ${booking.centreName}
- Site: ${booking.siteNumber}
- Dates: ${booking.startDate.toLocaleDateString()} - ${booking.endDate.toLocaleDateString()}

Best regards,
The Casual Lease Team
  `;

  await sendEmail({
    to: booking.customerEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });
  
  console.log(`[Email] Sent insurance rejection email to ${booking.customerEmail} for booking ${booking.bookingNumber}`);
}

/**
 * Send automated email when insurance document is unreadable
 */
export async function sendInsuranceUnreadableEmail(
  customer: {
    name: string;
    email: string;
  },
  bookingNumber: string
): Promise<void> {
  const { sendEmail } = await import('./email');
  
  const subject = `Please Re-upload Insurance - Booking ${bookingNumber}`;
  
  const htmlBody = `
    <h2>Insurance Document Needs Attention</h2>
    
    <p>Dear ${customer.name},</p>
    
    <p>We received your insurance document for booking <strong>${bookingNumber}</strong>, but our system 
    couldn't read all the required information from it.</p>
    
    <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0;">
      <strong>Common Issues:</strong><br>
      • Photo is blurry or too small<br>
      • Document is rotated incorrectly<br>
      • Important sections are cut off<br>
      • PDF is password-protected or corrupted
    </div>
    
    <p><strong>Please re-upload a clear version showing:</strong></p>
    <ul>
      <li>✓ Expiry date clearly visible</li>
      <li>✓ Coverage amount (must be $20 million minimum)</li>
      <li>✓ Policy number</li>
      <li>✓ Insurance company name</li>
    </ul>
    
    <p><strong>Tips for a good upload:</strong></p>
    <ul>
      <li>Use a scanner if possible (better than phone camera)</li>
      <li>Make sure image is well-lit and in focus</li>
      <li>Ensure entire document is in frame</li>
      <li>Save as PDF or high-quality JPEG</li>
    </ul>
    
    <p>Log in to your account and go to "My Bookings" to update your insurance document.</p>
    
    <p>Best regards,<br>
    The Casual Lease Team</p>
  `;
  
  const textBody = `
Insurance Document Needs Attention

Dear ${customer.name},

We received your insurance document for booking ${bookingNumber}, but our system couldn't read all the required information from it.

Common Issues:
• Photo is blurry or too small
• Document is rotated incorrectly  
• Important sections are cut off
• PDF is password-protected or corrupted

Please re-upload a clear version showing:
✓ Expiry date clearly visible
✓ Coverage amount ($20M minimum)
✓ Policy number
✓ Insurance company name

Tips for a good upload:
• Use a scanner if possible
• Make sure image is well-lit and in focus
• Ensure entire document is in frame
• Save as PDF or high-quality JPEG

Log in to your account and go to "My Bookings" to update your insurance document.

Best regards,
The Casual Lease Team
  `;

  await sendEmail({
    to: customer.email,
    subject,
    html: htmlBody,
    text: textBody,
  });
  
  console.log(`[Email] Sent insurance unreadable email to ${customer.email} for booking ${bookingNumber}`);
}

