import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);

  const results = await db.execute(sql`
    SELECT s.id as site_id, s."siteNumber", uc.name as category_name
    FROM sites s
    LEFT JOIN site_usage_categories suc ON s.id = suc."siteId"
    LEFT JOIN usage_categories uc ON suc."categoryId" = uc.id
    WHERE s."centreId" = 7
    ORDER BY s.id, uc.name
  `);

  console.log("Campbelltown Mall sites and their approved categories:");
  const bySite: Record<string, string[]> = {};
  for (const r of results.rows) {
    const key = `Site ${r.site_id} (${r.siteNumber})`;
    if (!bySite[key]) bySite[key] = [];
    if (r.category_name) bySite[key].push(r.category_name as string);
  }
  for (const [site, cats] of Object.entries(bySite)) {
    console.log(`  ${site}`);
    console.log(`    Categories: ${cats.length > 0 ? cats.join(", ") : "(none)"}`);
  }
  
  // Check if any category matches "socks", "shoes", "footwear"
  const footwearTerms = ["sock", "socks", "shoe", "shoes", "footwear", "boot", "boots"];
  const allCats = new Set<string>();
  for (const cats of Object.values(bySite)) {
    cats.forEach(c => allCats.add(c.toLowerCase()));
  }
  console.log("\nAll unique categories at Campbelltown:", [...allCats].sort().join(", "));
  console.log("\nFootwear-related matches:", [...allCats].filter(c => footwearTerms.some(t => c.includes(t))));

  process.exit(0);
}
main().catch(console.error);
