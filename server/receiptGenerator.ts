import { jsPDF } from 'jspdf';
import { getBookingById, getSiteById, getShoppingCentreById, getUserById, getCustomerProfileByUserId } from './db';
import { getLogoAsBase64, getOwnerIdFromContext } from './logoHelper';

/**
 * Generate payment receipt PDF for a booking
 * Returns base64 encoded PDF string
 */
export async function generateReceiptPDF(bookingId: number, receiptNumber: string): Promise<string> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const site = await getSiteById(booking.siteId);
  if (!site) throw new Error('Site not found');

  const centre = await getShoppingCentreById(site.centreId);
  if (!centre) throw new Error('Centre not found');

  const customer = await getUserById(booking.customerId);
  if (!customer) throw new Error('Customer not found');

  const profile = await getCustomerProfileByUserId(customer.id);

  const ownerId = await getOwnerIdFromContext({ bookingId });

  const doc = new jsPDF();
  doc.setFont('helvetica');

  // Add Logo (same pattern as invoiceGenerator.ts)
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
    console.error('[Receipt] Error adding logo:', error);
    doc.setFontSize(24);
    doc.setTextColor(18, 48, 71);
    doc.text('Casual Lease', 20, 25);
  }

  // Receipt Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT RECEIPT', 140, 25, { align: 'left' });

  // Receipt Details (right side)
  doc.setFontSize(10);
  doc.text(`Receipt Number: ${receiptNumber}`, 140, 35);
  doc.text(`Date: ${formatDate(new Date())}`, 140, 42);

  // Customer Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Received From:', 20, 50);
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
  doc.text(`Booking Reference: ${booking.bookingNumber}`, 20, yPos);
  yPos += 7;
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

  // Usage / activity
  if (booking.customUsage) {
    doc.text(`Usage: ${booking.customUsage}`, 20, yPos);
    yPos += 7;
  }

  yPos += 10;

  // Payment Summary table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Summary', 20, yPos);
  yPos += 3;

  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const totalAmount = Number(booking.totalAmount);
  const gstAmount = Number(booking.gstAmount);
  const subtotal = totalAmount - gstAmount;

  doc.text('Amount excl. GST', 20, yPos);
  doc.text(formatCurrency(subtotal), 160, yPos, { align: 'right' });
  yPos += 7;

  doc.text(`GST (${booking.gstPercentage}%)`, 20, yPos);
  doc.text(formatCurrency(gstAmount), 160, yPos, { align: 'right' });
  yPos += 10;

  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL AMOUNT PAID', 20, yPos);
  doc.text(formatCurrency(totalAmount), 160, yPos, { align: 'right' });
  yPos += 15;

  // Payment Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Information:', 20, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (booking.paidAt) {
    doc.text(`Payment Date: ${formatDate(booking.paidAt)}`, 20, yPos);
    yPos += 7;
  }

  const paymentMethodLabel = booking.paymentMethod === 'stripe' ? 'Stripe (Online)' : 'EFT / Invoice';
  doc.text(`Payment Method: ${paymentMethodLabel}`, 20, yPos);
  yPos += 12;

  // Reference to tax invoice
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Relates to Tax Invoice #${booking.bookingNumber}`, 20, yPos);
  yPos += 7;

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your payment!', 105, 280, { align: 'center' });
  doc.text('For inquiries, please contact us at info@casuallease.com', 105, 286, { align: 'center' });

  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}
