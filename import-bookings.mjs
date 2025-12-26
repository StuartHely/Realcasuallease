import { drizzle } from 'drizzle-orm/mysql2';
import { bookings, sites, shoppingCentres, users } from './drizzle/schema.js';
import { eq, and } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { parse } from 'date-fns';

const db = drizzle(process.env.DATABASE_URL);

async function importBookings() {
  console.log('Starting booking data import...');

  // Read the CSV file
  const csvContent = readFileSync('/home/ubuntu/upload/SampleDataCL26122025.csv', 'utf-8');
  const lines = csvContent.split('\n').map(line => line.split(','));

  // Find the centre name (row 3)
  const centreName = lines[2][1].trim();
  console.log(`Processing centre: ${centreName}`);

  // Get the centre from database
  const centreResults = await db.select().from(shoppingCentres).where(
    eq(shoppingCentres.name, centreName)
  );
  
  if (centreResults.length === 0) {
    console.error(`Centre "${centreName}" not found in database`);
    return;
  }
  const centre = centreResults[0];

  // Parse dates from row 5 (index 4)
  const dateRow = lines[4];
  const dates = [];
  for (let i = 1; i < dateRow.length; i++) {
    if (dateRow[i] && dateRow[i].trim()) {
      try {
        // Parse date in format d/m/yyyy or dd/mm/yyyy
        const dateParts = dateRow[i].trim().split('/');
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(dateParts[2]);
        const date = new Date(year, month, day);
        dates.push(date);
      } catch (e) {
        console.error(`Error parsing date: ${dateRow[i]}`);
      }
    }
  }

  console.log(`Found ${dates.length} dates from ${dates[0]?.toLocaleDateString()} to ${dates[dates.length - 1]?.toLocaleDateString()}`);

  // Get or create test user
  let testUser;
  const existingUsers = await db.select().from(users).where(eq(users.email, 'test-booking@casuallease.com'));
  
  if (existingUsers.length > 0) {
    testUser = existingUsers[0];
    console.log(`Using existing test user: ${testUser.email}`);
  } else {
    const insertResult = await db.insert(users).values({
      openId: 'test-booking-user',
      email: 'test-booking@casuallease.com',
      name: 'Test Booking User',
      loginMethod: 'manus',
      role: 'customer',
    });
    testUser = { id: Number(insertResult[0].insertId) };
    console.log(`Created test user with ID: ${testUser.id}`);
  }

  // Process each site row (starting from row 6, index 5)
  let totalBookings = 0;
  for (let rowIdx = 5; rowIdx < lines.length; rowIdx++) {
    const row = lines[rowIdx];
    if (!row[0] || !row[0].trim()) continue;

    const siteNumber = row[0].trim();
    console.log(`\nProcessing Site ${siteNumber}...`);

    // Get the site from database
    const siteResults = await db.select().from(sites).where(
      and(
        eq(sites.centreId, centre.id),
        eq(sites.siteNumber, siteNumber)
      )
    );

    if (siteResults.length === 0) {
      console.warn(`  Site ${siteNumber} not found in database, skipping`);
      continue;
    }
    const site = siteResults[0];

    // Find consecutive booking periods
    let bookingStart = null;
    let bookingEnd = null;

    for (let i = 0; i < dates.length; i++) {
      const hasBooking = row[i + 1] && row[i + 1].trim().toUpperCase() === 'C';

      if (hasBooking) {
        if (!bookingStart) {
          bookingStart = dates[i];
        }
        bookingEnd = dates[i];
      } else {
        // End of a booking period
        if (bookingStart && bookingEnd) {
          await createBooking(db, site, testUser, bookingStart, bookingEnd);
          totalBookings++;
          bookingStart = null;
          bookingEnd = null;
        }
      }
    }

    // Handle last booking if it extends to the end
    if (bookingStart && bookingEnd) {
      await createBooking(db, site, testUser, bookingStart, bookingEnd);
      totalBookings++;
    }
  }

  console.log(`\n✅ Import complete! Created ${totalBookings} bookings.`);
}

async function createBooking(db, site, user, startDate, endDate) {
  // Calculate duration and pricing
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  const totalAmount = (weeks * Number(site.pricePerWeek)) + (remainingDays * Number(site.pricePerDay));
  const gstAmount = totalAmount * 0.1;
  const platformFee = totalAmount * 0.1; // 10% platform fee
  const ownerAmount = totalAmount - platformFee;

  const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  console.log(`  Creating booking: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} (${days} days, $${totalAmount.toFixed(2)})`);

  await db.insert(bookings).values({
    bookingNumber,
    siteId: site.id,
    customerId: user.id,
    usageTypeId: 1, // Default usage type
    startDate,
    endDate,
    totalAmount: totalAmount.toFixed(2),
    gstAmount: gstAmount.toFixed(2),
    ownerAmount: ownerAmount.toFixed(2),
    platformFee: platformFee.toFixed(2),
    status: 'confirmed',
    requiresApproval: false,
  });
}

// Run the import
importBookings().catch(console.error);
