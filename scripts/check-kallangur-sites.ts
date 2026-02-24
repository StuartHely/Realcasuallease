import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkKallangurSites() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const kallangurSites = await db
    .select()
    .from(sites)
    .where(eq(sites.centreId, 15)); // Kallangur ID is 15
  
  console.log(`Kallangur sites: ${kallangurSites.length}\n`);
  
  kallangurSites.forEach(site => {
    console.log(`Site ${site.siteNumber} (ID: ${site.id})`);
    console.log(`  Floor Level ID: ${site.floorLevelId || '❌ Not assigned'}`);
    console.log(`  Coordinates: x=${site.xCoordinate || 'null'}, y=${site.yCoordinate || 'null'}`);
  });
  
  await pool.end();
}

checkKallangurSites().catch(console.error);