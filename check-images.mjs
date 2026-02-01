import { db } from './server/db.js';
import { sites } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const results = await db.select({
  id: sites.id,
  siteNumber: sites.siteNumber,
  imageUrl1: sites.imageUrl1,
  imageUrl2: sites.imageUrl2
}).from(sites).where(eq(sites.centreId, 60004)).limit(5);

console.log(JSON.stringify(results, null, 2));
process.exit(0);
