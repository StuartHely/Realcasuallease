import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { floorLevels, shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkFloorMaps() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const centres = await db.select().from(shoppingCentres);
  
  for (const centre of centres) {
    console.log(`\n${centre.name}:`);
    const floors = await db
      .select()
      .from(floorLevels)
      .where(eq(floorLevels.centreId, centre.id));
    
    if (floors.length === 0) {
      console.log('  ❌ No floor levels');
    } else {
      floors.forEach(floor => {
        console.log(`  - ${floor.levelName}: ${floor.mapImageUrl ? '✅ Has map' : '❌ No map'}`);
      });
    }
  }
  
  await pool.end();
}

checkFloorMaps().catch(console.error);