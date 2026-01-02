import { parseSearchQuery, siteMatchesRequirements } from "../shared/queryParser";
import * as db from "../server/db";

async function testSearch() {
  const query = "campbelltown 3m x 3m";
  const date = new Date("2025-12-29");
  
  console.log("Testing search with:");
  console.log("  Query:", query);
  console.log("  Date:", date.toISOString());
  
  // Parse query
  const parsedQuery = parseSearchQuery(query);
  console.log("\nParsed query:", JSON.stringify(parsedQuery, null, 2));
  
  // Search centres
  const centres = await db.searchShoppingCentres(parsedQuery.centreName || query);
  console.log("\nFound centres:", centres.map(c => c.name));
  
  if (centres.length > 0) {
    const centre = centres[0];
    console.log("\nProcessing centre:", centre.name);
    
    // Get all sites
    const allSites = await db.getSitesByCentreId(centre.id);
    console.log(`Total sites: ${allSites.length}`);
    
    // Filter sites
    const filteredSites = allSites.filter(site => 
      siteMatchesRequirements(site, parsedQuery)
    );
    console.log(`Filtered sites: ${filteredSites.length}`);
    
    // Show first 5 filtered sites
    console.log("\nFiltered sites (first 5):");
    filteredSites.slice(0, 5).forEach(site => {
      console.log(`  ${site.siteNumber}: size="${site.size}", maxTables=${site.maxTables}`);
    });
  }
}

testSearch().catch(console.error);
