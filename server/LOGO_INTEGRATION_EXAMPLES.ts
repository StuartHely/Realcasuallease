/**
 * EXAMPLES: How to Use Dynamic Logo in Documents
 * 
 * This file shows examples of integrating the dynamic logo system
 * into PDFs, emails, reports, and other documents.
 */

// =============================================================================
// EXAMPLE 1: PDF Documents (Invoices, Reports, Licenses)
// =============================================================================

import { jsPDF } from 'jspdf';
import { getLogoAsBase64 } from './logoHelper';
import { sendEmail } from './_core/email';

export async function generatePDFWithLogo() {
  const doc = new jsPDF();
  
  // Get logo as base64
  const logoBase64 = await getLogoAsBase64();
  
  if (logoBase64) {
    // Add logo to PDF
    // Parameters: imageData, format, x, y, width, height
    doc.addImage(logoBase64, 'PNG', 20, 10, 60, 20);
  } else {
    // Fallback if logo not available
    doc.setFontSize(20);
    doc.text('Real Casual Leasing', 20, 25);
  }
  
  // Continue with rest of PDF content
  doc.setFontSize(16);
  doc.text('Invoice', 20, 40);
  // ... more content
  
  return doc.output('dataurlstring');
}

// =============================================================================
// EXAMPLE 2: HTML Emails with Logo
// =============================================================================

import { generateEmailTemplate, generateEmailContent, formatBookingDetailsHTML } from './_core/emailTemplate';

export async function sendBookingConfirmationWithLogo(booking: any) {
  // Create email content
  const content = generateEmailContent([
    {
      title: 'Booking Confirmed!',
      content: `Dear ${booking.customerName},<br><br>Great news! Your booking has been approved.`
    },
    {
      title: 'Booking Details',
      content: formatBookingDetailsHTML({
        'Booking Number': booking.bookingNumber,
        'Location': `${booking.centreName} - Site ${booking.siteNumber}`,
        'Dates': `${booking.startDate} to ${booking.endDate}`,
        'Total Amount': `$${booking.totalAmount}`
      })
    }
  ]);
  
  // Wrap in template with logo
  const htmlEmail = await generateEmailTemplate(content, 'Booking Confirmation');
  
  // Send email (using your email service)
  await sendEmail({
    to: booking.customerEmail,
    subject: 'Booking Confirmed',
    html: htmlEmail
  });
}

// =============================================================================
// EXAMPLE 3: Weekly Reports with Logo
// =============================================================================

export async function generateWeeklyReportWithLogo(centreId: number, weekDate: Date) {
  // Generate report HTML
  const reportContent = `
    <h2 style="color: #123047;">Weekly Booking Report</h2>
    <p>Week Commencing: ${weekDate.toLocaleDateString()}</p>
    
    <h3>Bookings Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background-color: #f5f5f5;">
        <th style="padding: 8px; border: 1px solid #ddd;">Booking #</th>
        <th style="padding: 8px; border: 1px solid #ddd;">Customer</th>
        <th style="padding: 8px; border: 1px solid #ddd;">Site</th>
        <th style="padding: 8px; border: 1px solid #ddd;">Dates</th>
      </tr>
      <!-- Report data rows -->
    </table>
  `;
  
  // Wrap in email template with logo
  const htmlReport = await generateEmailTemplate(reportContent, 'Weekly Report');
  
  return htmlReport;
}

// =============================================================================
// EXAMPLE 4: License Documents with Logo
// =============================================================================

export async function generateLicensePDF(licenseData: any) {
  const doc = new jsPDF();
  
  // Add logo at top
  const logoBase64 = await getLogoAsBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 20, 10, 60, 20);
  }
  
  // License title
  doc.setFontSize(20);
  doc.text('CASUAL LEASE LICENSE', 105, 40, { align: 'center' });
  
  // License details
  doc.setFontSize(12);
  doc.text(`License Number: ${licenseData.licenseNumber}`, 20, 60);
  doc.text(`Issued To: ${licenseData.customerName}`, 20, 70);
  doc.text(`Valid From: ${licenseData.startDate}`, 20, 80);
  doc.text(`Valid Until: ${licenseData.endDate}`, 20, 90);
  
  // Terms and conditions
  doc.setFontSize(10);
  doc.text('Terms and Conditions:', 20, 110);
  // ... add terms
  
  return doc.output('dataurlstring');
}

// =============================================================================
// EXAMPLE 5: Financial Reports with Logo
// =============================================================================

export async function generateFinancialReportPDF(reportData: any) {
  const doc = new jsPDF();
  
  // Add logo
  const logoBase64 = await getLogoAsBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 20, 10, 60, 20);
  }
  
  // Report header
  doc.setFontSize(18);
  doc.text('FINANCIAL REPORT', 105, 40, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Period: ${reportData.period}`, 20, 50);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 57);
  
  // Add report content
  // Revenue table, charts, etc.
  
  return doc.output('dataurlstring');
}

// =============================================================================
// EXAMPLE 6: Rejection Email with Logo (Insurance Issues)
// =============================================================================

import { generateEmailAlert, generateEmailButton } from './_core/emailTemplate';

export async function sendRejectionEmailWithLogo(booking: any, reason: string) {
  const content = generateEmailContent([
    {
      title: 'Booking Update Required',
      content: `Dear ${booking.customerName},<br><br>Your booking request requires attention.`
    }
  ]) +
  generateEmailAlert(reason, 'warning') +
  `<p>Please log in to update your booking details:</p>` +
  generateEmailButton('Update Booking', `${process.env.BASE_URL}/my-bookings`);
  
  const htmlEmail = await generateEmailTemplate(content, 'Booking Update Required');
  
  await sendEmail({
    to: booking.customerEmail,
    subject: `Action Required - Booking ${booking.bookingNumber}`,
    html: htmlEmail
  });
}

// =============================================================================
// EXAMPLE 7: Using Logo URL Directly (for web pages or simple cases)
// =============================================================================

import { getCurrentLogoUrl } from './logoHelper';

export async function getLogoForWebDisplay() {
  const logoUrl = await getCurrentLogoUrl();
  
  // Use in HTML
  return `<img src="${logoUrl}" alt="Logo" style="max-width: 200px;" />`;
}

// =============================================================================
// TIPS & BEST PRACTICES
// =============================================================================

/*
1. Always use getLogoAsBase64() for PDFs - it embeds the image
2. Use getLogoUrlForEmail() for HTML emails - provides public URL
3. Add error handling - logo might not be available
4. Provide text fallback if logo fails to load
5. Size recommendations:
   - PDFs: 60-80px width for headers
   - Emails: 150-200px width for headers
   - Reports: 80-100px width for headers
6. Position consistently across all documents
7. Test with all 5 logo options to ensure they work
8. Use caching when possible to avoid repeated database queries
*/
