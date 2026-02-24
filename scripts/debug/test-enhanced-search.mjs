import * as db from './server/db.ts';

console.log("Testing Enhanced Search Functionality\n");

const testQueries = [
  "Pacific Square Site 2",
  "Pacific Square Outside Prouds",
  "Highlands Site 8",
  "campbelltown mall",
  "Outside Coles",
  "Site 1",
];

for (const query of testQueries) {
  console.log(`\nQuery: "${query}"`);
  console.log("=".repeat(50));
  
  try {
    // Test site search
    const siteResults = await db.searchSites(query);
    console.log(`Site-level results: ${siteResults.length} matches`);
    
    if (siteResults.length > 0) {
      siteResults.slice(0, 3).forEach(({ site, centre }) => {
        console.log(`  - ${centre?.name || 'Unknown'} - Site ${site.siteNumber}: ${site.description}`);
      });
    }
    
    // Test centre search
    const centreResults = await db.searchShoppingCentres(query);
    console.log(`Centre-level results: ${centreResults.length} matches`);
    
    if (centreResults.length > 0) {
      centreResults.slice(0, 2).forEach(centre => {
        console.log(`  - ${centre.name} (${centre.suburb || 'Unknown suburb'})`);
      });
    }
    
  } catch (error) {
    console.error(`  Error: ${error.message}`);
  }
}

console.log("\n✅ Enhanced search test complete!");
process.exit(0);
