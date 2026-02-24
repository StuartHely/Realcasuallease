import { searchSitesWithCategory } from './server/db.ts';

async function main() {
  console.log('Testing searchSitesWithCategory with "Highlands" and "books" keyword\n');
  
  const results = await searchSitesWithCategory('Highlands', 'books');
  
  console.log(`\nFound ${results.length} sites:\n`);
  
  results.forEach(result => {
    const site = result.site;
    const categories = result.categories || [];
    const hasBooks = categories.some(cat => cat.name.toLowerCase().includes('book'));
    
    console.log(`Site ${site.siteNumber}:`);
    console.log(`  - Size: ${site.length}m x ${site.width}m`);
    console.log(`  - Categories: ${categories.length} approved`);
    console.log(`  - Has "books" category: ${hasBooks}`);
    
    if (hasBooks) {
      const booksCategories = categories.filter(cat => cat.name.toLowerCase().includes('book'));
      console.log(`  - Books categories: ${booksCategories.map(c => c.name).join(', ')}`);
    }
    
    console.log('');
  });
  
  // Check specifically for Site 3
  const site3 = results.find(r => r.site.siteNumber === '3');
  if (site3) {
    console.log('❌ BUG: Site 3 should NOT be in results when searching for books!');
  } else {
    console.log('✅ CORRECT: Site 3 is not in results');
  }
}

main().catch(console.error).finally(() => process.exit(0));
