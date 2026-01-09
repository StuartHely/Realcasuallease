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
  
  console.log('Site 3 ID:', site3[0].id);
  
  // Get approved categories
  const approved = await getApprovedCategoriesForSite(site3[0].id);
  
  console.log(`\nSite 3 has ${approved.length} approved categories:`);
  
  // Check if Books & Stationery is in the list
  const hasBooks = approved.some(cat => cat.name === 'Books & Stationery');
  console.log(`\nHas "Books & Stationery"? ${hasBooks}`);
  
  if (hasBooks) {
    console.log('❌ BUG: Site 3 should NOT have Books & Stationery approved!');
  } else {
    console.log('✅ CORRECT: Site 3 does not have Books & Stationery approved');
  }
  
  // Check if "books" keyword matches any category
  const booksMatch = approved.some(cat => 
    cat.name.toLowerCase().includes('books')
  );
  console.log(`\nDoes any category name include "books"? ${booksMatch}`);
}

main().catch(console.error).finally(() => process.exit(0));
