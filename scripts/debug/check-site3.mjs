import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sites, shoppingCentres } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const centres = await db.select({id: shoppingCentres.id}).from(shoppingCentres).where(eq(shoppingCentres.name, 'Carnes Hill Marketplace'));

if (centres.length > 0) {
  const centreId = centres[0].id;
  const allSites = await db.select().from(sites).where(eq(sites.centreId, centreId));
  
  console.log('Site#\tX\tY\tVisible');
  allSites.forEach(s => {
    const x = s.mapMarkerX === null ? 'NULL' : s.mapMarkerX;
    const y = s.mapMarkerY === null ? 'NULL' : s.mapMarkerY;
    const v = s.mapMarkerX !== null && s.mapMarkerY !== null ? 'YES' : 'NO';
    console.log(`${s.siteNumber}\t${x}\t${y}\t${v}`);
  });
}

await connection.end();
