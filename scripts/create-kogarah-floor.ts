import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { floorLevels } from "../drizzle/schema";

async function createKogarahFloor() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  await db.insert(floorLevels).values({
    centreId: 13, // Kogarah
    levelName: "Ground Floor",
    levelNumber: 0, // Add this!
    displayOrder: 1,
    mapImageUrl: null,
    isHidden: false,
  });
  
  console.log('✅ Created Ground Floor for Kogarah Town Centre!');
  
  await pool.end();
}

createKogarahFloor().catch(console.error);