import { drizzle } from 'drizzle-orm/mysql2';
import { shoppingCentres, sites } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function cleanupDuplicates() {
  console.log('Checking for duplicate centres...\n');

  const centres = await db.select().from(shoppingCentres);
  
  console.log('All centres:');
  for (const c of centres) {
    const sitesList = await db.select().from(sites).where(eq(sites.centreId, c.id));
    console.log(`  ID ${c.id}: ${c.name} - ${sitesList.length} sites`);
  }

  console.log('\n---\n');

  // Find Highlands Marketplace entries
  const highlands = centres.filter(c => c.name === 'Highlands Marketplace');
  
  if (highlands.length > 1) {
    console.log(`Found ${highlands.length} Highlands Marketplace entries:`);
    
    for (const h of highlands) {
      const sitesList = await db.select().from(sites).where(eq(sites.centreId, h.id));
      console.log(`  ID ${h.id}: ${sitesList.length} sites`);
    }

    // Find the one with sites (keep it) and delete the empty one
    const withSites = highlands.find(h => {
      const count = centres.filter(c => c.id === h.id).length;
      return count > 0;
    });

    // Get actual site counts
    const siteCounts = await Promise.all(
      highlands.map(async (h) => {
        const sitesList = await db.select().from(sites).where(eq(sites.centreId, h.id));
        return { id: h.id, count: sitesList.length };
      })
    );

    console.log('\nSite counts:');
    siteCounts.forEach(sc => console.log(`  Centre ID ${sc.id}: ${sc.count} sites`));

    // Delete centres with 0 sites
    for (const sc of siteCounts) {
      if (sc.count === 0) {
        console.log(`\nDeleting empty centre ID ${sc.id}...`);
        await db.delete(shoppingCentres).where(eq(shoppingCentres.id, sc.id));
        console.log('✅ Deleted');
      }
    }
  } else {
    console.log('No duplicates found');
  }

  console.log('\n✅ Cleanup complete!');
}

cleanupDuplicates().catch(console.error);
