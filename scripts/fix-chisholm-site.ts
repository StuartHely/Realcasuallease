import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixChisholmSite() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Assign Site 1 to Ground Floor (ID: 5)
  await db
    .update(sites)
    .set({ 
      floorLevelId: 5,
      // Reset coordinates so user can place it fresh
      xCoordinate: null,
      yCoordinate: null
    })
    .where(eq(sites.id, 57));
  
  console.log('✅ Fixed Site 1:');
  console.log('  - Assigned to Ground Floor (ID: 5)');
  console.log('  - Reset coordinates to null');
  console.log('\n📍 Now go to Map Management and place the site on the map!');
  
  await pool.end();
}

fixChisholmSite().catch(console.error);