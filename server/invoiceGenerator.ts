import { jsPDF } from 'jspdf';
import { getBookingById, getSiteById, getShoppingCentreById, getUserById, getCustomerProfileByUserId } from './db';

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

  // Create PDF
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Header - Company Name
  doc.setFontSize(24);
  doc.setTextColor(18, 48, 71); // #123047
  doc.text('Casual Lease', 20, 25);
  
  // Invoice Title
  doc.setFontSize(20);
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
  if (site.description) {
    doc.text(`Description: ${site.description}`, 20, yPos);
    yPos += 7;
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
  
  // Bank Details (placeholder - should be configurable)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Details:', 20, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Bank: [Bank Name]', 20, yPos);
  yPos += 7;
  doc.text('BSB: [BSB Number]', 20, yPos);
  yPos += 7;
  doc.text('Account Number: [Account Number]', 20, yPos);
  yPos += 7;
  doc.text('Account Name: Casual Lease Pty Ltd', 20, yPos);
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
