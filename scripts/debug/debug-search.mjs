import { drizzle } from 'drizzle-orm/mysql2';
import { shoppingCentres } from './drizzle/schema.js';
import { like, or } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function debugSearch() {
  console.log('Checking database for Highlands Marketplace...\n');

  // Check all centres
  const allCentres = await db.select().from(shoppingCentres);
  console.log(`Total centres in database: ${allCentres.length}`);
  allCentres.forEach(c => console.log(`  - ${c.name} (${c.suburb}, ${c.city})`));

  console.log('\n---\n');

  // Try exact search
  const exactSearch = await db.select().from(shoppingCentres).where(
    like(shoppingCentres.name, 'Highlands Marketplace')
  );
  console.log(`Exact match "Highlands Marketplace": ${exactSearch.length} results`);

  // Try partial search
  const partialSearch = await db.select().from(shoppingCentres).where(
    or(
      like(shoppingCentres.name, '%Highlands%'),
      like(shoppingCentres.suburb, '%Highlands%'),
      like(shoppingCentres.city, '%Highlands%')
    )
  );
  console.log(`Partial match "Highlands": ${partialSearch.length} results`);
  partialSearch.forEach(c => console.log(`  - ${c.name}`));
}

debugSearch().catch(console.error);
