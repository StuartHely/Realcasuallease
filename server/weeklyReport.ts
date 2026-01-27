import ExcelJS from 'exceljs';
import { getDb } from './db';
import { shoppingCentres, sites, bookings, customerProfiles, users } from '../drizzle/schema';
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';

/**
 * Generate weekly booking report for a shopping centre
 * Report covers 9 consecutive days: Sunday before week + 7 days of week + Monday after
 */
export async function generateWeeklyBookingReport(centreId: number, weekCommencingDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get centre details
  const centreResult = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, centreId)).limit(1);
  const centre = centreResult[0];
  if (!centre) throw new Error(`Centre ${centreId} not found`);

  // Calculate date range: Sunday before week through Monday after week (9 days total)
  const startDate = new Date(weekCommencingDate);
  startDate.setDate(startDate.getDate() - 1); // Go back to Sunday before
  
  const endDate = new Date(weekCommencingDate);
  endDate.setDate(endDate.getDate() + 8); // Go forward to Monday after (7 days + 1)

  // Get all sites for this centre
  const centreSites = await db.select().from(sites).where(eq(sites.centreId, centreId));

  // Get all bookings in the date range
  const bookingsInRange = await db.select({
    booking: bookings,
    customer: customerProfiles,
    user: users,
    site: sites,
  })
    .from(bookings)
    .leftJoin(customerProfiles, eq(bookings.customerId, customerProfiles.userId))
    .leftJoin(users, eq(customerProfiles.userId, users.id))
    .leftJoin(sites, eq(bookings.siteId, sites.id))
    .where(
      and(
        eq(sites.centreId, centreId),
        gte(bookings.startDate, startDate),
        lte(bookings.startDate, endDate)
      )
    );

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Weekly Report');

  // Format dates for headers
  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName} ${day}/${month}/${year}`;
  };

  // Add header rows
  worksheet.mergeCells('A1:K1');
  worksheet.getCell('A1').value = centre.name;
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:K2');
  worksheet.getCell('A2').value = 'Casual Leasing Activities';
  worksheet.getCell('A2').font = { bold: true, size: 12 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  // Format week commencing date
  const weekCommencingFormatted = `${String(weekCommencingDate.getDate()).padStart(2, '0')}/${String(weekCommencingDate.getMonth() + 1).padStart(2, '0')}/${weekCommencingDate.getFullYear()}`;
  const endOfWeek = new Date(weekCommencingDate);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  const endOfWeekFormatted = `${String(endOfWeek.getDate()).padStart(2, '0')}/${String(endOfWeek.getMonth() + 1).padStart(2, '0')}/${endOfWeek.getFullYear()}`;
  
  worksheet.mergeCells('A3:K3');
  worksheet.getCell('A3').value = `${weekCommencingFormatted} to ${endOfWeekFormatted}`;
  worksheet.getCell('A3').font = { bold: true };
  worksheet.getCell('A3').alignment = { horizontal: 'center' };

  // Empty row
  worksheet.addRow([]);

  // Column headers (9 day columns)
  const headerRow = worksheet.addRow([
    'Site Number',
    'Site Description',
    formatDate(startDate), // Sunday before
    formatDate(new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000)), // Monday
    formatDate(new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000)), // Tuesday
    formatDate(new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000)), // Wednesday
    formatDate(new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000)), // Thursday
    formatDate(new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000)), // Friday
    formatDate(new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)), // Saturday
    formatDate(new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)), // Sunday after
    formatDate(new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000)), // Monday after
  ]);

  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };

  // Set column widths
  worksheet.getColumn(1).width = 12; // Site Number
  worksheet.getColumn(2).width = 30; // Site Description
  for (let i = 3; i <= 11; i++) {
    worksheet.getColumn(i).width = 20; // Date columns
  }

  // Add data rows for each site
  for (const site of centreSites) {
    const row = [site.siteNumber, site.description || ''];
    
    // For each of the 9 days, find bookings for this site
    for (let dayOffset = 0; dayOffset < 9; dayOffset++) {
      const currentDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      
      // Find bookings that overlap with this day
      const dayBookings = bookingsInRange.filter(b => {
        if (!b.booking || !b.site || b.site.id !== site.id) return false;
        const bookingStart = new Date(b.booking.startDate);
        const bookingEnd = new Date(b.booking.endDate);
        return bookingStart < nextDate && bookingEnd >= currentDate;
      });

      if (dayBookings.length > 0) {
        // Format booking details
        const bookingDetails = dayBookings.map(b => {
          const customer = b.customer;
          const booking = b.booking;
          
          // Use Trading Name if available, otherwise Company Name
          const businessName = customer?.tradingName || customer?.companyName || 'N/A';
          const productCategory = customer?.productCategory || 'N/A';
          const contactName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'N/A';
          const contactPhone = customer?.phone || 'N/A';
          const contactEmail = b.user?.email || 'N/A';
          
          const startDateStr = booking ? new Date(booking.startDate).toLocaleDateString('en-AU') : '';
          const endDateStr = booking ? new Date(booking.endDate).toLocaleDateString('en-AU') : '';
          const bookedDates = `${startDateStr} to ${endDateStr}`;
          
          const tablesChairs = `${booking?.tablesRequested || 0} tables, ${booking?.chairsRequested || 0} chairs`;
          
          return `${businessName}\n${productCategory}\n${contactName}\n${contactPhone}\n${contactEmail}\n${bookedDates}\n${tablesChairs}`;
        }).join('\n\n');
        
        row.push(bookingDetails);
      } else {
        row.push('');
      }
    }
    
    const dataRow = worksheet.addRow(row);
    dataRow.alignment = { vertical: 'top', wrapText: true };
    
    // Make company name and product category bold (first two lines of each cell)
    for (let col = 3; col <= 11; col++) {
      const cell = dataRow.getCell(col);
      if (cell.value) {
        // Note: ExcelJS doesn't support inline formatting easily, 
        // so we'll use a workaround with rich text
        const lines = String(cell.value).split('\n');
        if (lines.length >= 2) {
          cell.value = {
            richText: [
              { text: lines[0] + '\n', font: { bold: true } },
              { text: lines[1] + '\n', font: { bold: true } },
              { text: lines.slice(2).join('\n') }
            ]
          };
        }
      }
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Get list of email recipients for a centre's weekly report
 */
export async function getWeeklyReportRecipients(centreId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const centreResult = await db.select().from(shoppingCentres).where(eq(shoppingCentres.id, centreId)).limit(1);
  const centre = centreResult[0];
  if (!centre) return [];

  const emails: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const emailField = `weeklyReportEmail${i}` as keyof typeof centre;
    const email = centre[emailField];
    if (email && typeof email === 'string' && email.trim()) {
      emails.push(email.trim());
    }
  }

  return emails;
}

/**
 * Format email subject line
 */
export function formatWeeklyReportSubject(centreName: string, weekCommencingDate: Date): string {
  const formatted = `${String(weekCommencingDate.getDate()).padStart(2, '0')}/${String(weekCommencingDate.getMonth() + 1).padStart(2, '0')}/${weekCommencingDate.getFullYear()}`;
  return `${centreName} Casual Leasing Bookings Week Commencing ${formatted}`;
}
