import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bookings, sites, shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkBookingCentre() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const result = await db
    .select({
      booking: bookings,
      site: sites,
      centre: shoppingCentres,
    })
    .from(bookings)
    .leftJoin(sites, eq(bookings.siteId, sites.id))
    .leftJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .limit(1);
  
  if (result.length > 0) {
    console.log('Booking details:');
    console.log('- Booking number:', result[0].booking.bookingNumber);
    console.log('- Total amount:', result[0].booking.totalAmount);
    console.log('- Site:', result[0].site?.siteNumber);
    console.log('- Centre:', result[0].centre?.name);
    console.log('- Centre ID:', result[0].centre?.id);
    console.log('- Centre includeInMainSite:', result[0].centre?.includeInMainSite);
  }
  
  await pool.end();
}

checkBookingCentre().catch(console.error);