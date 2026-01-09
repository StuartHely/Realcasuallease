import { searchSitesWithCategory } from './server/db.ts';

async function test() {
  console.log('Testing searchSitesWithCategory...');
  console.log('Query: "Highlands", Category: "books"');
  
  const results = await searchSitesWithCategory("Highlands", "books");
  
  console.log('\nResults count:', results.length);
  console.log('\nSites returned:');
  results.forEach(r => {
    console.log(`- Site ${r.site.siteNumber} (${r.site.sizeLength}m x ${r.site.sizeWidth}m)`);
  });
}

test().catch(console.error);
