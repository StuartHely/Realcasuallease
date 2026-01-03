import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sites } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await db.select({
  id: sites.id,
  siteNumber: sites.siteNumber,
  mapMarkerX: sites.mapMarkerX,
  mapMarkerY: sites.mapMarkerY
}).from(sites).where(eq(sites.centreId, 60003));

console.log('Highlands Marketplace Sites:');
result.forEach(site => {
  console.log(`Site ${site.siteNumber}: X=${site.mapMarkerX}, Y=${site.mapMarkerY}`);
});

await connection.end();
