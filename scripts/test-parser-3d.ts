import { parseSearchQuery, siteMatchesRequirements } from "../shared/queryParser";

// Test with actual database format
const query = "campbelltown 3m x 3m";
const parsed = parseSearchQuery(query);

console.log("Query:", query);
console.log("Parsed:", JSON.stringify(parsed, null, 2));

// Test with actual Campbelltown site data
const site1 = {
  size: "3m x 3m x 1.5m high",
  maxTables: 5,
};

const site4 = {
  size: "3m x 4m x 1.5m high",
  maxTables: 5,
};

console.log("\nSite 1 (3m x 3m x 1.5m high):");
console.log("  Matches:", siteMatchesRequirements(site1, parsed));

console.log("\nSite 4 (3m x 4m x 1.5m high):");
console.log("  Matches:", siteMatchesRequirements(site4, parsed));
