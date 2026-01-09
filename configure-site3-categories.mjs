import { getDb } from './server/db.ts';
import { setApprovedCategoriesForSite } from './server/usageCategoriesDb.ts';
import { sites, shoppingCentres, usageCategories } from './drizzle/schema.ts';
import { eq, and } from 'drizzle-orm';

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
  
  // Get Site 3
  const site3 = await db.select().from(sites)
    .where(and(
      eq(sites.centreId, highlands[0].id),
      eq(sites.siteNumber, '3')
    ))
    .limit(1);
  
  if (site3.length === 0) {
    console.error('Site 3 not found');
    return;
  }
  
  console.log('Found site:', site3[0].siteNumber, 'ID:', site3[0].id);
  
  // Get all categories EXCEPT books, charities, government
  const excludedCategories = ['Books & Stationery', 'Charities & Non-Profits', 'Government & Public Services'];
  const allCategories = await db.select().from(usageCategories);
  
  const approvedCategoryIds = allCategories
    .filter(cat => !excludedCategories.includes(cat.name))
    .map(cat => cat.id);
  
  console.log(`\nApproving ${approvedCategoryIds.length} categories for Site 3`);
  console.log(`Excluding: ${excludedCategories.join(', ')}`);
  
  // Set approved categories
  await setApprovedCategoriesForSite(site3[0].id, approvedCategoryIds);
  
  console.log('\n✅ Categories configured successfully!');
  
  // Verify
  const { getApprovedCategoriesForSite } = await import('./server/usageCategoriesDb.ts');
  const approved = await getApprovedCategoriesForSite(site3[0].id);
  console.log(`\nVerification: Site 3 now has ${approved.length} approved categories`);
}

main().catch(console.error).finally(() => process.exit(0));
