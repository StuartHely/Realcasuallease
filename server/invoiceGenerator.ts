import { jsPDF } from 'jspdf';
import { getBookingById, getSiteById, getShoppingCentreById, getUserById, getCustomerProfileByUserId, resolveRemittanceBankAccount } from './db';
import { getLogoAsBase64, getOwnerIdFromContext } from './logoHelper';
import * as assetDb from './assetDb';

/**
 * Convert rich-text/HTML description (as stored for sites, assets, centres) into
 * plain text suitable for jsPDF rendering. Preserves paragraph breaks as `\n`.
 */
function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate invoice PDF for a booking
 * Returns base64 encoded PDF string
 */
export async function generateInvoicePDF(bookingId: number): Promise<string> {
  // Get booking details
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Get related data
  const site = await getSiteById(booking.siteId);
  if (!site) {
    throw new Error('Site not found');
  }

  const centre = await getShoppingCentreById(site.centreId);
  if (!centre) {
    throw new Error('Centre not found');
  }

  const customer = await getUserById(booking.customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const profile = await getCustomerProfileByUserId(customer.id);

  // Get owner ID to use owner-specific logo
  const ownerId = await getOwnerIdFromContext({ bookingId });

  // Create PDF
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Add Logo (owner-specific or default)
  try {
    const logoBase64 = await getLogoAsBase64(ownerId);
    if (logoBase64) {
      // Add logo image - positioned at top left
      doc.addImage(logoBase64, 'PNG', 20, 10, 60, 20);
    } else {
      // Fallback to text if logo not available
      doc.setFontSize(24);
      doc.setTextColor(18, 48, 71);
      doc.text('Casual Lease', 20, 25);
    }
  } catch (error) {
    console.error('[Invoice] Error adding logo:', error);
    // Fallback to text
    doc.setFontSize(24);
    doc.setTextColor(18, 48, 71);
    doc.text('Casual Lease', 20, 25);
  }
  
  // Invoice Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 150, 25);
  
  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Number: ${booking.bookingNumber}`, 150, 35);
  doc.text(`Date: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`, 150, 42);
  doc.text(`Due Date: ${getDueDate()}`, 150, 49);
  
  // Customer Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  let yPos = 58;
  // Show Trading Name if available, otherwise Company Name
  const businessName = profile?.tradingName || profile?.companyName;
  if (businessName) {
    doc.text(businessName, 20, yPos);
    yPos += 7;
    // If trading name is different from company name, show company name in smaller text
    if (profile?.tradingName && profile?.companyName && profile.tradingName !== profile.companyName) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`(${profile.companyName})`, 20, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      yPos += 7;
    }
  }
  if (customer.name) {
    doc.text(customer.name, 20, yPos);
    yPos += 7;
  }
  if (customer.email) {
    doc.text(customer.email, 20, yPos);
    yPos += 7;
  }
  if (profile?.phone) {
    doc.text(profile.phone, 20, yPos);
    yPos += 7;
  }
  
  // Booking Details
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Booking Details:', 20, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Location: ${centre.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Site: ${site.siteNumber}`, 20, yPos);
  yPos += 7;
  const siteDescriptionText = htmlToPlainText(site.description);
  if (siteDescriptionText) {
    const lines = doc.splitTextToSize(`Description: ${siteDescriptionText}`, 170);
    doc.text(lines, 20, yPos);
    yPos += 7 * lines.length;
  }
  doc.text(`Start Date: ${formatDate(booking.startDate)}`, 20, yPos);
  yPos += 7;
  doc.text(`End Date: ${formatDate(booking.endDate)}`, 20, yPos);
  yPos += 7;
  
  // Calculate number of days
  const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  doc.text(`Duration: ${days} day${days > 1 ? 's' : ''}`, 20, yPos);
  yPos += 15;
  
  // Line items table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Description', 20, yPos);
  doc.text('Amount', 160, yPos, { align: 'right' });
  yPos += 3;
  
  // Draw line
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  // Line items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const subtotal = Number(booking.totalAmount) - Number(booking.gstAmount);
  doc.text(`Site rental (${days} days)`, 20, yPos);
  doc.text(formatCurrency(subtotal), 160, yPos, { align: 'right' });
  yPos += 7;
  
  doc.text(`GST (${booking.gstPercentage}%)`, 20, yPos);
  doc.text(formatCurrency(Number(booking.gstAmount)), 160, yPos, { align: 'right' });
  yPos += 10;
  
  // Total line
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL DUE', 20, yPos);
  doc.text(formatCurrency(Number(booking.totalAmount)), 160, yPos, { align: 'right' });
  yPos += 15;
  
  // Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Terms:', 20, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Payment is due within 14 days of invoice date (NET-14).', 20, yPos);
  yPos += 7;
  doc.text('Please include the invoice number in your payment reference.', 20, yPos);
  yPos += 15;
  
  // Bank Details — resolved from centre → portfolio → owner hierarchy
  const bankAccount = await resolveRemittanceBankAccount(centre.id);
  if (!bankAccount) {
    console.error('[Invoice] No bank account configured for centre:', centre.id);
    throw new Error('No bank account configured for this centre — cannot generate invoice');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Details:', 20, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`BSB: ${bankAccount.bankBsb}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Number: ${bankAccount.bankAccountNumber}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Name: ${bankAccount.bankAccountName}`, 20, yPos);
  yPos += 15;
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  doc.text('For inquiries, please contact us at info@casuallease.com', 105, 286, { align: 'center' });
  
  // Generate base64 PDF
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

/**
 * Format date to Australian format
 */
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format currency to AUD
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

/**
 * Calculate due date (14 days from now)
 */
function getDueDate(): string {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  return formatDate(dueDate);
}

/**
 * Generate invoice PDF for a Vacant Shop booking
 * Returns base64 encoded PDF string
 */
export async function generateVSInvoicePDF(bookingId: number): Promise<string> {
  const booking = await assetDb.getVacantShopBookingById(bookingId);
  if (!booking) {
    throw new Error('VS Booking not found');
  }

  const shop = await assetDb.getVacantShopById(booking.vacantShopId);
  if (!shop) {
    throw new Error('Vacant shop not found');
  }

  const centre = await getShoppingCentreById(shop.centreId);
  if (!centre) {
    throw new Error('Centre not found');
  }

  const customer = await getUserById(booking.customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const profile = await getCustomerProfileByUserId(customer.id);

  const ownerId = await getOwnerIdFromContext({ centreId: centre.id });

  const doc = new jsPDF();
  doc.setFont('helvetica');

  // Add Logo
  try {
    const logoBase64 = await getLogoAsBase64(ownerId);
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 20, 10, 60, 20);
    } else {
      doc.setFontSize(24);
      doc.setTextColor(18, 48, 71);
      doc.text('Casual Lease', 20, 25);
    }
  } catch (error) {
    console.error('[Invoice-VS] Error adding logo:', error);
    doc.setFontSize(24);
    doc.setTextColor(18, 48, 71);
    doc.text('Casual Lease', 20, 25);
  }

  // Invoice Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 150, 25);

  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Number: ${booking.bookingNumber}`, 150, 35);
  doc.text(`Date: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`, 150, 42);
  doc.text(`Due Date: ${getDueDate()}`, 150, 49);

  // Customer Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let yPos = 58;
  const businessName = profile?.tradingName || profile?.companyName;
  if (businessName) {
    doc.text(businessName, 20, yPos);
    yPos += 7;
    if (profile?.tradingName && profile?.companyName && profile.tradingName !== profile.companyName) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`(${profile.companyName})`, 20, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      yPos += 7;
    }
  }
  if (customer.name) {
    doc.text(customer.name, 20, yPos);
    yPos += 7;
  }
  if (customer.email) {
    doc.text(customer.email, 20, yPos);
    yPos += 7;
  }
  if (profile?.phone) {
    doc.text(profile.phone, 20, yPos);
    yPos += 7;
  }

  // Booking Details
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Booking Details:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Location: ${centre.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Vacant Shop: ${shop.shopNumber}`, 20, yPos);
  yPos += 7;
  if (shop.totalSizeM2) {
    doc.text(`Size: ${shop.totalSizeM2} m²`, 20, yPos);
    yPos += 7;
  }
  doc.text(`Start Date: ${formatDate(booking.startDate)}`, 20, yPos);
  yPos += 7;
  doc.text(`End Date: ${formatDate(booking.endDate)}`, 20, yPos);
  yPos += 7;

  const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weeks = Math.round(days / 7);
  const durationText = weeks >= 4 ? `${Math.round(weeks / 4.33)} month${Math.round(weeks / 4.33) > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''}`;
  doc.text(`Duration: ${durationText} (${days} days)`, 20, yPos);
  yPos += 15;

  // Line items table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Description', 20, yPos);
  doc.text('Amount', 160, yPos, { align: 'right' });
  yPos += 3;

  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const subtotal = Number(booking.totalAmount) - Number(booking.gstAmount);
  doc.text(`Vacant shop rental (${shop.shopNumber})`, 20, yPos);
  doc.text(formatCurrency(subtotal), 160, yPos, { align: 'right' });
  yPos += 7;

  doc.text(`GST (${booking.gstPercentage}%)`, 20, yPos);
  doc.text(formatCurrency(Number(booking.gstAmount)), 160, yPos, { align: 'right' });
  yPos += 10;

  // Total line
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL DUE', 20, yPos);
  doc.text(formatCurrency(Number(booking.totalAmount)), 160, yPos, { align: 'right' });
  yPos += 15;

  // Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Terms:', 20, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Payment is due within 14 days of invoice date (NET-14).', 20, yPos);
  yPos += 7;
  doc.text('Please include the invoice number in your payment reference.', 20, yPos);
  yPos += 15;

  // Bank Details
  const bankAccount = await resolveRemittanceBankAccount(centre.id);
  if (!bankAccount) {
    console.error('[Invoice-VS] No bank account configured for centre:', centre.id);
    throw new Error('No bank account configured for this centre — cannot generate invoice');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Details:', 20, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`BSB: ${bankAccount.bankBsb}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Number: ${bankAccount.bankAccountNumber}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Name: ${bankAccount.bankAccountName}`, 20, yPos);
  yPos += 15;

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  doc.text('For inquiries, please contact us at info@casuallease.com', 105, 286, { align: 'center' });

  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

/**
 * Generate invoice PDF for a Third Line Income booking
 * Returns base64 encoded PDF string
 */
export async function generateTLIInvoicePDF(bookingId: number): Promise<string> {
  const booking = await assetDb.getThirdLineBookingById(bookingId);
  if (!booking) {
    throw new Error('TLI Booking not found');
  }

  const asset = await assetDb.getThirdLineIncomeById(booking.thirdLineIncomeId);
  if (!asset) {
    throw new Error('Third line income asset not found');
  }

  const centre = await getShoppingCentreById(asset.centreId);
  if (!centre) {
    throw new Error('Centre not found');
  }

  const customer = await getUserById(booking.customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const profile = await getCustomerProfileByUserId(customer.id);

  const ownerId = await getOwnerIdFromContext({ centreId: centre.id });

  const doc = new jsPDF();
  doc.setFont('helvetica');

  // Add Logo
  try {
    const logoBase64 = await getLogoAsBase64(ownerId);
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 20, 10, 60, 20);
    } else {
      doc.setFontSize(24);
      doc.setTextColor(18, 48, 71);
      doc.text('Casual Lease', 20, 25);
    }
  } catch (error) {
    console.error('[Invoice-TLI] Error adding logo:', error);
    doc.setFontSize(24);
    doc.setTextColor(18, 48, 71);
    doc.text('Casual Lease', 20, 25);
  }

  // Invoice Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 150, 25);

  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Number: ${booking.bookingNumber}`, 150, 35);
  doc.text(`Date: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`, 150, 42);
  doc.text(`Due Date: ${getDueDate()}`, 150, 49);

  // Customer Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let yPos = 58;
  const businessName = profile?.tradingName || profile?.companyName;
  if (businessName) {
    doc.text(businessName, 20, yPos);
    yPos += 7;
    if (profile?.tradingName && profile?.companyName && profile.tradingName !== profile.companyName) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`(${profile.companyName})`, 20, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      yPos += 7;
    }
  }
  if (customer.name) {
    doc.text(customer.name, 20, yPos);
    yPos += 7;
  }
  if (customer.email) {
    doc.text(customer.email, 20, yPos);
    yPos += 7;
  }
  if (profile?.phone) {
    doc.text(profile.phone, 20, yPos);
    yPos += 7;
  }

  // Booking Details
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Booking Details:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Location: ${centre.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Third Line Asset: ${asset.assetNumber}`, 20, yPos);
  yPos += 7;
  const assetDescriptionText = htmlToPlainText(asset.description);
  if (assetDescriptionText) {
    const lines = doc.splitTextToSize(`Description: ${assetDescriptionText}`, 170);
    doc.text(lines, 20, yPos);
    yPos += 7 * lines.length;
  }
  doc.text(`Start Date: ${formatDate(booking.startDate)}`, 20, yPos);
  yPos += 7;
  doc.text(`End Date: ${formatDate(booking.endDate)}`, 20, yPos);
  yPos += 7;

  const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weeks = Math.round(days / 7);
  const durationText = weeks >= 4 ? `${Math.round(weeks / 4.33)} month${Math.round(weeks / 4.33) > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''}`;
  doc.text(`Duration: ${durationText} (${days} days)`, 20, yPos);
  yPos += 15;

  // Line items table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Description', 20, yPos);
  doc.text('Amount', 160, yPos, { align: 'right' });
  yPos += 3;

  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const subtotal = Number(booking.totalAmount) - Number(booking.gstAmount);
  doc.text(`Third line income asset rental (${asset.assetNumber})`, 20, yPos);
  doc.text(formatCurrency(subtotal), 160, yPos, { align: 'right' });
  yPos += 7;

  doc.text(`GST (${booking.gstPercentage}%)`, 20, yPos);
  doc.text(formatCurrency(Number(booking.gstAmount)), 160, yPos, { align: 'right' });
  yPos += 10;

  // Total line
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL DUE', 20, yPos);
  doc.text(formatCurrency(Number(booking.totalAmount)), 160, yPos, { align: 'right' });
  yPos += 15;

  // Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Terms:', 20, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Payment is due within 14 days of invoice date (NET-14).', 20, yPos);
  yPos += 7;
  doc.text('Please include the invoice number in your payment reference.', 20, yPos);
  yPos += 15;

  // Bank Details
  const bankAccount = await resolveRemittanceBankAccount(centre.id);
  if (!bankAccount) {
    console.error('[Invoice-TLI] No bank account configured for centre:', centre.id);
    throw new Error('No bank account configured for this centre — cannot generate invoice');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Details:', 20, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`BSB: ${bankAccount.bankBsb}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Number: ${bankAccount.bankAccountNumber}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Name: ${bankAccount.bankAccountName}`, 20, yPos);
  yPos += 15;

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  doc.text('For inquiries, please contact us at info@casuallease.com', 105, 286, { align: 'center' });

  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}
