import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { floorLevels } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkKogarahFloors() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const floors = await db
    .select()
    .from(floorLevels)
    .where(eq(floorLevels.centreId, 13));
  
  console.log(`Kogarah floor levels: ${floors.length}\n`);
  floors.forEach(floor => {
    console.log(`Level: ${floor.levelName}`);
    console.log(`Map: ${floor.mapImageUrl || '❌ None'}`);
    console.log('---');
  });
  
  await pool.end();
}

checkKogarahFloors().catch(console.error);