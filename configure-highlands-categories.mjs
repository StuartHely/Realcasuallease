import { getDb } from './server/db.ts';
import { setApprovedCategoriesForSite } from './server/usageCategoriesDb.ts';
import { sites, shoppingCentres, usageCategories } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  
  // Get Highlands Marketplace
  const highlands = await db.select().from(shoppingCentres)
    .where(eq(shoppingCentres.name, 'Highlands Marketplace'))
    .limit(1);
  
  if (highlands.length === 0) {
    console.error('Highlands Marketplace not found');
    return;
  }
  
  console.log('Found centre:', highlands[0].name, 'ID:', highlands[0].id);
  
  // Get all sites
  const highlandsSites = await db.select().from(sites)
    .where(eq(sites.centreId, highlands[0].id));
  
  console.log(`Found ${highlandsSites.length} sites`);
  
  // Get all categories
  const allCategories = await db.select().from(usageCategories);
  const allCategoryIds = allCategories.map(cat => cat.id);
  
  console.log(`Total categories: ${allCategoryIds.length}\n`);
  
  // Configure each site
  for (const site of highlandsSites) {
    if (site.siteNumber === '3') {
            // Site 3: exclude books (both categories), charities, government
      const excludedCategories = ['Books', 'Books & Stationery', 'Charities & Non-Profits', 'Government & Public Services'];
      const approvedIds = allCategories
        .filter(cat => !excludedCategories.includes(cat.name))
        .map(cat => cat.id);
      
      await setApprovedCategoriesForSite(site.id, approvedIds);
      console.log(`✅ Site ${site.siteNumber}: ${approvedIds.length} categories (excluding books, charities, government)`);
    } else {
      // All other sites: approve ALL categories
      await setApprovedCategoriesForSite(site.id, allCategoryIds);
      console.log(`✅ Site ${site.siteNumber}: ${allCategoryIds.length} categories (all approved)`);
    }
  }
  
  console.log('\n✅ All Highlands sites configured successfully!');
}

main().catch(console.error).finally(() => process.exit(0));
