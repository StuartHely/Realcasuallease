import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixKallangurSites() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Assign all 3 sites to Ground Floor (ID: 6)
  const siteIds = [58, 59, 60];
  
  for (const siteId of siteIds) {
    await db
      .update(sites)
      .set({ 
        floorLevelId: 6, // Ground Floor
        xCoordinate: null,
        yCoordinate: null
      })
      .where(eq(sites.id, siteId));
  }
  
  console.log('✅ Fixed all 3 Kallangur sites:');
  console.log('  - Assigned to Ground Floor (ID: 6)');
  console.log('  - Reset coordinates to null');
  console.log('\n📍 Now go to Map Management and place the sites on the map!');
  
  await pool.end();
}

fixKallangurSites().catch(console.error);