import { drizzle } from 'drizzle-orm/mysql2';
import { bookings, sites, shoppingCentres } from './drizzle/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function verifyBookings() {
  console.log('Verifying imported bookings...\n');

  // Get Highlands Marketplace
  const centres = await db.select().from(shoppingCentres).where(
    eq(shoppingCentres.name, 'Highlands Marketplace')
  );

  if (centres.length === 0) {
    console.error('Highlands Marketplace not found');
    return;
  }

  const centre = centres[0];
  console.log(`Centre: ${centre.name} (ID: ${centre.id})\n`);

  // Get all sites for this centre
  const allSites = await db.select().from(sites).where(
    eq(sites.centreId, centre.id)
  );

  console.log(`Total sites in centre: ${allSites.length}\n`);

  // Test dates
  const testDates = [
    new Date('2025-12-29'),  // Should show bookings
    new Date('2026-01-05'),  // Should show bookings
    new Date('2026-01-12'),  // Should show bookings
  ];

  for (const testDate of testDates) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing date: ${testDate.toLocaleDateString('en-AU')}`);
    console.log('='.repeat(60));

    // Calculate week range (7 days starting from testDate)
    const weekStart = new Date(testDate);
    const weekEnd = new Date(testDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    console.log(`Week range: ${weekStart.toLocaleDateString('en-AU')} - ${weekEnd.toLocaleDateString('en-AU')}\n`);

    // Check each site
    for (const site of allSites.slice(0, 10)) { // Limit to first 10 sites for readability
      const siteBookings = await db.select().from(bookings).where(
        and(
          eq(bookings.siteId, site.id),
          // Booking overlaps if: booking.start <= week.end AND booking.end >= week.start
          lte(bookings.startDate, weekEnd),
          gte(bookings.endDate, weekStart)
        )
      );

      const isAvailable = siteBookings.length === 0;
      const status = isAvailable ? '✅ AVAILABLE' : '❌ BOOKED';
      
      console.log(`  Site ${site.siteNumber}: ${status}`);
      
      if (!isAvailable) {
        siteBookings.forEach(booking => {
          console.log(`    └─ Booking: ${booking.startDate.toLocaleDateString('en-AU')} to ${booking.endDate.toLocaleDateString('en-AU')} (${booking.status})`);
        });
      }
    }
  }

  // Summary statistics
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY STATISTICS');
  console.log('='.repeat(60));

  const allBookings = await db.select().from(bookings).where(
    eq(bookings.siteId, allSites[0].id)
  ).then(() => db.select().from(bookings));

  const highlandsBookings = [];
  for (const site of allSites) {
    const siteBookings = await db.select().from(bookings).where(
      eq(bookings.siteId, site.id)
    );
    highlandsBookings.push(...siteBookings);
  }

  console.log(`\nTotal bookings for Highlands Marketplace: ${highlandsBookings.length}`);
  
  const bookingsBySite = {};
  highlandsBookings.forEach(booking => {
    const site = allSites.find(s => s.id === booking.siteId);
    if (site) {
      bookingsBySite[site.siteNumber] = (bookingsBySite[site.siteNumber] || 0) + 1;
    }
  });

  console.log('\nBookings by site:');
  Object.entries(bookingsBySite).sort((a, b) => a[0].localeCompare(b[0])).forEach(([siteNum, count]) => {
    console.log(`  Site ${siteNum}: ${count} booking(s)`);
  });

  console.log('\n✅ Verification complete!');
}

verifyBookings().catch(console.error);
