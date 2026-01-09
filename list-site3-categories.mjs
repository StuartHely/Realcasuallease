import { getDb } from './server/db.ts';
import { getApprovedCategoriesForSite } from './server/usageCategoriesDb.ts';
import { sites, shoppingCentres } from './drizzle/schema.ts';
import { eq, and } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  
  // Get Highlands Marketplace
  const highlands = await db.select().from(shoppingCentres)
    .where(eq(shoppingCentres.name, 'Highlands Marketplace'))
    .limit(1);
  
  // Get Site 3
  const site3 = await db.select().from(sites)
    .where(and(
      eq(sites.centreId, highlands[0].id),
      eq(sites.siteNumber, '3')
    ))
    .limit(1);
  
  // Get approved categories
  const approved = await getApprovedCategoriesForSite(site3[0].id);
  
  console.log(`Site 3 approved categories (${approved.length} total):\n`);
  
  approved.forEach((cat, idx) => {
    const hasBooks = cat.name.toLowerCase().includes('book');
    console.log(`${idx + 1}. ${cat.name}${hasBooks ? ' ← CONTAINS "BOOK"' : ''}`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
