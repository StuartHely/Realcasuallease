import { drizzle } from "drizzle-orm/mysql2";
import { sites } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

// Table size: 762mm × 1835mm = 1.396m²
const TABLE_AREA = 1.396;

// Parse site size string (e.g., "3m x 3m x 1.5m high") and calculate area
function parseSiteSize(sizeString: string | null): number | null {
  if (!sizeString) return null;
  
  // Extract dimensions like "3m x 4m" or "2.4m x 3m"
  const match = sizeString.match(/([\d.]+)m?\s*x\s*([\d.]+)m?/i);
  if (!match) return null;
  
  const width = parseFloat(match[1]);
  const length = parseFloat(match[2]);
  
  if (isNaN(width) || isNaN(length)) return null;
  
  return width * length;
}

// Calculate max tables based on site area
function calculateMaxTables(area: number): number {
  if (!area || area <= 0) return 0;
  return Math.floor(area / TABLE_AREA);
}

async function updateAllSites() {
  console.log("Fetching all sites...");
  const allSites = await db.select().from(sites);
  
  console.log(`Found ${allSites.length} sites`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const site of allSites) {
    const area = parseSiteSize(site.size);
    
    if (area === null) {
      console.log(`⚠️  Site ${site.siteNumber}: Could not parse size "${site.size}"`);
      skipped++;
      continue;
    }
    
    const maxTables = calculateMaxTables(area);
    
    // Update the site
    await db.update(sites)
      .set({ maxTables })
      .where(eq(sites.id, site.id));
    
    console.log(`✓ Site ${site.siteNumber}: ${site.size} = ${area.toFixed(2)}m² → ${maxTables} tables`);
    updated++;
  }
  
  console.log(`\nComplete! Updated ${updated} sites, skipped ${skipped} sites`);
  process.exit(0);
}

updateAllSites().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
