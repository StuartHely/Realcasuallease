import { drizzle } from 'drizzle-orm/mysql2';
import { sites, bookings } from './drizzle/schema.js';
import { eq, inArray } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function checkData() {
  // Get sites for centre 1
  const sites1 = await db.select().from(sites).where(eq(sites.centreId, 1));
  console.log('Centre 1 sites:', sites1.length);
  const siteIds1 = sites1.map(s => s.id);
  if (siteIds1.length > 0) {
    const bookings1 = await db.select().from(bookings).where(inArray(bookings.siteId, siteIds1));
    console.log('Centre 1 bookings:', bookings1.length);
  }
  const withImages1 = sites1.filter(s => s.imageUrl1).length;
  console.log('Centre 1 sites with images:', withImages1);

  console.log('');

  // Get sites for centre 3
  const sites3 = await db.select().from(sites).where(eq(sites.centreId, 3));
  console.log('Centre 3 sites:', sites3.length);
  const siteIds3 = sites3.map(s => s.id);
  if (siteIds3.length > 0) {
    const bookings3 = await db.select().from(bookings).where(inArray(bookings.siteId, siteIds3));
    console.log('Centre 3 bookings:', bookings3.length);
  }
  const withImages3 = sites3.filter(s => s.imageUrl1).length;
  console.log('Centre 3 sites with images:', withImages3);

  console.log('\n---\nRecommendation:');
  if (bookings1.length > 0 || withImages1 > 0) {
    console.log('Keep Centre 1, delete Centre 3');
  } else if (bookings3.length > 0 || withImages3 > 0) {
    console.log('Keep Centre 3, delete Centre 1');
  } else {
    console.log('Both are empty, keep Centre 1 and delete Centre 3');
  }
}

checkData().catch(console.error);
