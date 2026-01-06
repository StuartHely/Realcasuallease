import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq, and, like } from 'drizzle-orm';
import * as fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Read CSV file
const csvContent = fs.readFileSync('/home/ubuntu/upload/SampleBookingDataCL06012026.csv', 'utf-8');
const lines = csvContent.split('\n');

// Parse dates from header (row 4, columns 3-16)
const headerLine = lines[3].split(',');
const dates = headerLine.slice(2, 16).map(d => {
  // Convert "1/06/2026" to "2026-06-01"
  const [day, month, year] = d.trim().split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
});

console.log('Dates to process:', dates);

// Build centre mapping dynamically from database
const centreNames = [
  'Highlands Marketplace',
  'Campbelltown Mall',
  'Carnes Hill Marketplace',
  'Pacific Square',
  'Wanneroo Central',
  'Rockdale Plaza',
  'Bass Hill Plaza',
  'Corio Village',
];

const centreMapping = {};
for (const name of centreNames) {
  const centres = await db.select().from(schema.shoppingCentres)
    .where(like(schema.shoppingCentres.name, `%${name}%`));
  if (centres.length > 0) {
    centreMapping[name] = centres[0].id;
    console.log(`Found centre: ${name} -> ID ${centres[0].id}`);
  } else {
    console.log(`⚠️  Centre not found: ${name}`);
  }
}

let currentCentre = null;
let bookingsCreated = 0;
let errors = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const cols = line.split(',');
  
  // Check if this is a centre header line
  const centreName = cols[0].trim();
  if (centreMapping[centreName]) {
    currentCentre = centreName;
    console.log(`\nProcessing centre: ${currentCentre}`);
    continue;
  }
  
  // Skip if no current centre or if this is a header row
  if (!currentCentre || cols[0].trim() === '' && cols[1].trim() === 'Site') {
    continue;
  }
  
  // Parse site row
  const siteNumber = cols[1].trim();
  if (!siteNumber || siteNumber === 'Site') continue;
  
  const centreId = centreMapping[currentCentre];
  
  // Find the site in database using LIKE to match "Site 1" with "Site 1 (Lower Level)"
  const siteResults = await db.select().from(schema.sites)
    .where(and(
      eq(schema.sites.centreId, centreId),
      like(schema.sites.siteNumber, `${siteNumber}%`)
    ));
  
  if (siteResults.length === 0) {
    console.log(`  ⚠️  Site ${siteNumber} not found in ${currentCentre} (centreId: ${centreId})`);
    errors++;
    continue;
  }
  
  const site = siteResults[0];
  
  // Process each date column (columns 2-15)
  for (let j = 2; j < Math.min(16, cols.length); j++) {
    const isBooked = cols[j].trim() === 'Y';
    if (!isBooked) continue;
    
    const dateIndex = j - 2;
    if (dateIndex >= dates.length) continue;
    
    const bookingDate = dates[dateIndex];
    
    // Check if booking already exists
    const existing = await db.select().from(schema.bookings)
      .where(and(
        eq(schema.bookings.siteId, site.id),
        eq(schema.bookings.startDate, new Date(bookingDate)),
        eq(schema.bookings.endDate, new Date(bookingDate))
      ));
    
    if (existing.length > 0) {
      continue; // Skip silently
    }
    
    // Create booking
    try {
      await db.insert(schema.bookings).values({
        siteId: site.id,
        userId: 30001, // Default user (owner)
        startDate: new Date(bookingDate),
        endDate: new Date(bookingDate),
        status: 'confirmed',
        totalAmount: site.pricePerDay || 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      bookingsCreated++;
      console.log(`  ✅ Created booking: ${site.siteNumber}, ${bookingDate}`);
    } catch (error) {
      console.log(`  ❌ Error creating booking: ${site.siteNumber}, ${bookingDate}`, error.message);
      errors++;
    }
  }
}

console.log(`\n✅ Import complete!`);
console.log(`   Bookings created: ${bookingsCreated}`);
console.log(`   Errors: ${errors}`);

await connection.end();
