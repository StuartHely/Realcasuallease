import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkKogarahSites() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const kogarahSites = await db
    .select()
    .from(sites)
    .where(eq(sites.centreId, 13));
  
  console.log(`Kogarah sites: ${kogarahSites.length}\n`);
  
  kogarahSites.forEach(site => {
    console.log(`Site ${site.siteNumber} (ID: ${site.id})`);
    console.log(`  Floor: ${site.floorLevelId || '❌ Not assigned to floor'}`);
    console.log(`  Position: x=${site.xCoordinate}, y=${site.yCoordinate}`);
  });
  
  await pool.end();
}

checkKogarahSites().catch(console.error);