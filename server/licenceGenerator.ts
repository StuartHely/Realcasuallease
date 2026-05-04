import { jsPDF } from 'jspdf';
import { eq } from 'drizzle-orm';
import {
  getBookingById,
  getSiteById,
  getShoppingCentreById,
  getUserById,
  getCustomerProfileByUserId,
  getOwnerById,
  getUsageTypeById,
  getDb,
} from './db';
import { getLogoAsBase64, getOwnerIdFromContext } from './logoHelper';
import { getConfigValue } from './systemConfigDb';
import { getLicenceStatus } from './licenceService';
import {
  vacantShops,
  vacantShopBookings,
  thirdLineIncome,
  thirdLineBookings,
  usageCategories,
} from '../drizzle/schema';

type LicenceData = {
  bookingNumber: string;
  centreName: string;
  centreAddress: string | null;
  ownerName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCompany: string | null;
  locationLabel: string;
  licenceFeeExGst: number;
  outgoings: number;
  gstAmount: number;
  startDate: Date | string;
  endDate: Date | string;
  permittedUse: string;
  insuranceCompany: string | null;
  insuranceAmount: string | null;
  insurancePolicyNo: string | null;
  insuranceExpiry: Date | string | null;
  ownerIdForLogo: number | undefined;
  // E-signature info — when present, the PDF is rendered as a signed copy
  signedAt?: Date | string | null;
  signedByName?: string | null;
  signedByIp?: string | null;
};

/**
 * Format date to Australian format: DD Mon YYYY
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
 * Strip HTML tags to plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Draw a table row with two columns
 */
function drawTableRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  labelWidth: number = 55,
): number {
  const pageWidth = 210;
  const margin = 20;
  const valueWidth = pageWidth - margin * 2 - labelWidth;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(18, 48, 71);
  doc.text(label, margin + 2, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(value, valueWidth - 4);
  doc.text(lines, margin + labelWidth + 2, y);

  const rowHeight = Math.max(lines.length * 5, 7);
  return y + rowHeight + 2;
}

/**
 * Draw a section header
 */
function drawSectionHeader(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(18, 48, 71);
  doc.rect(20, y, 170, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 22, y + 5);
  return y + 10;
}

/**
 * Check if we need a page break, and add one if so
 */
function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

/**
 * Core internal function that generates the licence PDF from structured data
 */
async function _generateLicencePDF(data: LicenceData): Promise<string> {
  const doc = new jsPDF();
  doc.setFont('helvetica');

  // --- Header ---
  try {
    const logoBase64 = await getLogoAsBase64(data.ownerIdForLogo);
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 20, 10, 60, 20);
    } else {
      doc.setFontSize(24);
      doc.setTextColor(18, 48, 71);
      doc.text('Casual Lease', 20, 25);
    }
  } catch {
    doc.setFontSize(24);
    doc.setTextColor(18, 48, 71);
    doc.text('Casual Lease', 20, 25);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(18, 48, 71);
  doc.text('LICENCE AGREEMENT', 190, 20, { align: 'right' });

  // Booking reference
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Ref: ${data.bookingNumber}`, 190, 28, { align: 'right' });

  // Divider
  doc.setDrawColor(18, 48, 71);
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  let y = 42;

  // --- Centre Details Table ---
  y = drawSectionHeader(doc, y, 'CENTRE DETAILS');

  // Table border
  const tableStartY = y;
  y = drawTableRow(doc, y, 'Centre:', data.centreName);
  if (data.centreAddress) {
    y = drawTableRow(doc, y, 'Address:', data.centreAddress);
  }
  y = drawTableRow(doc, y, 'Owner / Licensor:', data.ownerName);
  y += 3;

  // Draw table border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(20, tableStartY - 2, 170, y - tableStartY + 2);

  y += 3;

  // --- Licensee Details ---
  y = checkPageBreak(doc, y, 40);
  y = drawSectionHeader(doc, y, 'LICENSEE DETAILS');

  const licenseeStartY = y;
  y = drawTableRow(doc, y, 'Name:', data.customerName);
  y = drawTableRow(doc, y, 'Email:', data.customerEmail || 'N/A');
  if (data.customerPhone) {
    y = drawTableRow(doc, y, 'Phone:', data.customerPhone);
  }
  if (data.customerCompany) {
    y = drawTableRow(doc, y, 'Company:', data.customerCompany);
  }

  doc.setDrawColor(200, 200, 200);
  doc.rect(20, licenseeStartY - 2, 170, y - licenseeStartY + 2);

  y += 5;

  // --- Licence Details Table ---
  y = checkPageBreak(doc, y, 60);
  y = drawSectionHeader(doc, y, 'LICENCE DETAILS');

  const detailsStartY = y;
  y = drawTableRow(doc, y, 'Location:', data.locationLabel);
  y = drawTableRow(doc, y, 'Centre:', data.centreName);
  y = drawTableRow(doc, y, 'Licence Fee (ex GST):', formatCurrency(data.licenceFeeExGst));
  if (data.outgoings > 0) {
    y = drawTableRow(doc, y, 'Outgoings:', formatCurrency(data.outgoings));
  }
  y = drawTableRow(doc, y, 'GST:', formatCurrency(data.gstAmount));
  y = drawTableRow(
    doc,
    y,
    'Total (inc GST):',
    formatCurrency(data.licenceFeeExGst + data.outgoings + data.gstAmount),
  );
  y = drawTableRow(doc, y, 'Term Start:', formatDate(data.startDate));
  y = drawTableRow(doc, y, 'Term End:', formatDate(data.endDate));
  y = drawTableRow(doc, y, 'Permitted Use:', data.permittedUse);

  doc.setDrawColor(200, 200, 200);
  doc.rect(20, detailsStartY - 2, 170, y - detailsStartY + 2);

  y += 5;

  // --- Insurance Table ---
  y = checkPageBreak(doc, y, 40);
  y = drawSectionHeader(doc, y, 'PUBLIC LIABILITY INSURANCE');

  const insuranceStartY = y;
  y = drawTableRow(doc, y, 'Insurer:', data.insuranceCompany || 'Not provided');
  y = drawTableRow(
    doc,
    y,
    'Cover Amount:',
    data.insuranceAmount ? formatCurrency(Number(data.insuranceAmount)) : 'Not provided',
  );
  y = drawTableRow(doc, y, 'Policy Number:', data.insurancePolicyNo || 'Not provided');
  y = drawTableRow(
    doc,
    y,
    'Expiry Date:',
    data.insuranceExpiry ? formatDate(data.insuranceExpiry) : 'Not provided',
  );

  doc.setDrawColor(200, 200, 200);
  doc.rect(20, insuranceStartY - 2, 170, y - insuranceStartY + 2);

  y += 8;

  // --- Execution / Signature Section ---
  y = checkPageBreak(doc, y, 50);
  y = drawSectionHeader(doc, y, 'EXECUTION');

  // Owner signature
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 48, 71);
  doc.text('Licensor', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Name: ${data.ownerName}`, 20, y);
  y += 6;
  doc.text(`Date: ${formatDate(new Date())}`, 20, y);
  y += 6;

  doc.setDrawColor(180, 180, 180);
  doc.line(20, y, 100, y);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Signature', 20, y + 4);

  y += 12;

  // Licensee signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 48, 71);
  doc.text('Licensee', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Name: ${data.customerName}`, 20, y);
  y += 6;

  if (data.signedAt) {
    // Signed copy — show e-signature confirmation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 128, 0);
    doc.text('SIGNED ELECTRONICALLY', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Signed by: ${data.signedByName || data.customerName}`, 20, y);
    y += 5;
    doc.text(`Signed on: ${formatDate(data.signedAt)}`, 20, y);
    y += 5;
    if (data.signedByIp) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`IP address: ${data.signedByIp}`, 20, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      y += 5;
    }
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.line(20, y, 100, y);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Signature (Electronic Signature)', 20, y + 4);
    y += 6;
  }

  y += 12;

  // --- Terms & Conditions ---
  const termsHtml = await getConfigValue('licence_terms_and_conditions');
  if (termsHtml) {
    const termsText = stripHtml(termsHtml);
    const termsLines = doc.splitTextToSize(termsText, 170);

    // Start T&C on a new page if not enough space
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, y, 'TERMS & CONDITIONS');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);

    for (let i = 0; i < termsLines.length; i++) {
      y = checkPageBreak(doc, y, 6);
      doc.text(termsLines[i], 20, y);
      y += 4;
    }
  }

  // --- Footer on last page ---
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated ${formatDate(new Date())} — Casual Lease Pty Ltd`,
    105,
    287,
    { align: 'center' },
  );

  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

/**
 * Resolve the permitted use string for a CL booking
 */
async function resolvePermittedUse(booking: {
  usageTypeId: number | null;
  usageCategoryId: number | null;
  customUsage: string | null;
}): Promise<string> {
  if (booking.customUsage) return booking.customUsage;

  if (booking.usageCategoryId) {
    const db = await getDb();
    if (db) {
      const [cat] = await db
        .select()
        .from(usageCategories)
        .where(eq(usageCategories.id, booking.usageCategoryId));
      if (cat) return cat.name;
    }
  }

  if (booking.usageTypeId) {
    const ut = await getUsageTypeById(booking.usageTypeId);
    if (ut) return ut.name;
  }

  return 'As agreed';
}

/**
 * Generate licence agreement PDF for a standard CL booking
 */
export async function generateLicencePDFForBooking(bookingId: number): Promise<string> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const site = await getSiteById(booking.siteId);
  if (!site) throw new Error('Site not found');

  const centre = await getShoppingCentreById(site.centreId);
  if (!centre) throw new Error('Centre not found');

  const owner = await getOwnerById(centre.ownerId);
  if (!owner) throw new Error('Owner not found');

  const customer = await getUserById(booking.customerId);
  if (!customer) throw new Error('Customer not found');

  const profile = await getCustomerProfileByUserId(customer.id);
  const ownerId = await getOwnerIdFromContext({ bookingId });
  const permittedUse = await resolvePermittedUse(booking);
  const signature = await getLicenceStatus(bookingId, 'cl');

  const days = Math.ceil(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1;
  const outgoings = Number(site.outgoingsPerDay || 0) * days;
  const licenceFeeExGst = Number(booking.totalAmount) - Number(booking.gstAmount) - outgoings;

  return _generateLicencePDF({
    bookingNumber: booking.bookingNumber,
    centreName: centre.name,
    centreAddress: centre.address,
    ownerName: owner.name,
    customerName: customer.name || 'N/A',
    customerEmail: customer.email,
    customerPhone: profile?.phone ?? null,
    customerCompany: profile?.tradingName || profile?.companyName || null,
    locationLabel: `Site ${site.siteNumber}${site.description ? ' — ' + site.description : ''}`,
    licenceFeeExGst,
    outgoings,
    gstAmount: Number(booking.gstAmount),
    startDate: booking.startDate,
    endDate: booking.endDate,
    permittedUse,
    insuranceCompany: profile?.insuranceCompany ?? null,
    insuranceAmount: profile?.insuranceAmount ?? null,
    insurancePolicyNo: profile?.insurancePolicyNo ?? null,
    insuranceExpiry: profile?.insuranceExpiry ?? null,
    ownerIdForLogo: ownerId,
    signedAt: signature?.signedAt ?? null,
    signedByName: signature?.signedByName ?? null,
    signedByIp: signature?.signedByIp ?? null,
  });
}

/**
 * Generate licence agreement PDF for a Vacant Shop booking
 */
export async function generateLicencePDFForVSBooking(bookingId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [booking] = await db
    .select()
    .from(vacantShopBookings)
    .where(eq(vacantShopBookings.id, bookingId));
  if (!booking) throw new Error('VS Booking not found');

  const [shop] = await db
    .select()
    .from(vacantShops)
    .where(eq(vacantShops.id, booking.vacantShopId));
  if (!shop) throw new Error('Vacant shop not found');

  const centre = await getShoppingCentreById(shop.centreId);
  if (!centre) throw new Error('Centre not found');

  const owner = await getOwnerById(centre.ownerId);
  if (!owner) throw new Error('Owner not found');

  const customer = await getUserById(booking.customerId);
  if (!customer) throw new Error('Customer not found');

  const profile = await getCustomerProfileByUserId(customer.id);
  const ownerId = centre.ownerId;

  const days = Math.ceil(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1;
  const outgoings = Number(shop.outgoingsPerDay || 0) * days;
  const licenceFeeExGst = Number(booking.totalAmount) - Number(booking.gstAmount) - outgoings;

  return _generateLicencePDF({
    bookingNumber: booking.bookingNumber,
    centreName: centre.name,
    centreAddress: centre.address,
    ownerName: owner.name,
    customerName: customer.name || 'N/A',
    customerEmail: customer.email,
    customerPhone: profile?.phone ?? null,
    customerCompany: profile?.tradingName || profile?.companyName || null,
    locationLabel: `Vacant Shop ${shop.shopNumber}${shop.description ? ' — ' + shop.description : ''}`,
    licenceFeeExGst,
    outgoings,
    gstAmount: Number(booking.gstAmount),
    startDate: booking.startDate,
    endDate: booking.endDate,
    permittedUse: 'As agreed',
    insuranceCompany: profile?.insuranceCompany ?? null,
    insuranceAmount: profile?.insuranceAmount ?? null,
    insurancePolicyNo: profile?.insurancePolicyNo ?? null,
    insuranceExpiry: profile?.insuranceExpiry ?? null,
    ownerIdForLogo: ownerId,
  });
}

/**
 * Generate licence agreement PDF for a Third Line Income booking
 */
export async function generateLicencePDFForTLIBooking(bookingId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [booking] = await db
    .select()
    .from(thirdLineBookings)
    .where(eq(thirdLineBookings.id, bookingId));
  if (!booking) throw new Error('TLI Booking not found');

  const [asset] = await db
    .select()
    .from(thirdLineIncome)
    .where(eq(thirdLineIncome.id, booking.thirdLineIncomeId));
  if (!asset) throw new Error('Third line income asset not found');

  const centre = await getShoppingCentreById(asset.centreId);
  if (!centre) throw new Error('Centre not found');

  const owner = await getOwnerById(centre.ownerId);
  if (!owner) throw new Error('Owner not found');

  const customer = await getUserById(booking.customerId);
  if (!customer) throw new Error('Customer not found');

  const profile = await getCustomerProfileByUserId(customer.id);
  const ownerId = centre.ownerId;

  const days = Math.ceil(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1;
  const outgoings = Number(asset.outgoingsPerDay || 0) * days;
  const licenceFeeExGst = Number(booking.totalAmount) - Number(booking.gstAmount) - outgoings;

  return _generateLicencePDF({
    bookingNumber: booking.bookingNumber,
    centreName: centre.name,
    centreAddress: centre.address,
    ownerName: owner.name,
    customerName: customer.name || 'N/A',
    customerEmail: customer.email,
    customerPhone: profile?.phone ?? null,
    customerCompany: profile?.tradingName || profile?.companyName || null,
    locationLabel: `Asset ${asset.assetNumber}${asset.description ? ' — ' + asset.description : ''}`,
    licenceFeeExGst,
    outgoings,
    gstAmount: Number(booking.gstAmount),
    startDate: booking.startDate,
    endDate: booking.endDate,
    permittedUse: 'As agreed',
    insuranceCompany: profile?.insuranceCompany ?? null,
    insuranceAmount: profile?.insuranceAmount ?? null,
    insurancePolicyNo: profile?.insurancePolicyNo ?? null,
    insuranceExpiry: profile?.insuranceExpiry ?? null,
    ownerIdForLogo: ownerId,
  });
}
