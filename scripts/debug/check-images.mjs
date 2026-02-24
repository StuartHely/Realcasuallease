import { db } from './server/db.js';
import { sites, shopping_centres } from './drizzle/schema.js';
import { eq, like } from 'drizzle-orm';

const centre = await db.select().from(shopping_centres).where(like(shopping_centres.name, '%Campbelltown%')).limit(1);
if (centre.length > 0) {
  console.log('Centre:', centre[0].name, 'ID:', centre[0].id);
  const siteList = await db.select({
    id: sites.id,
    siteNumber: sites.siteNumber,
    imageUrl1: sites.imageUrl1,
    imageUrl2: sites.imageUrl2,
    imageUrl3: sites.imageUrl3
  }).from(sites).where(eq(sites.centreId, centre[0].id));
  console.log('\nSites with images:');
  siteList.forEach(s => {
    console.log(`Site ${s.siteNumber}: img1=${s.imageUrl1 ? 'YES' : 'null'}, img2=${s.imageUrl2 ? 'YES' : 'null'}, img3=${s.imageUrl3 ? 'YES' : 'null'}`);
    if (s.imageUrl1) console.log('  URL1:', s.imageUrl1.substring(0, 80) + '...');
  });
}
process.exit(0);
