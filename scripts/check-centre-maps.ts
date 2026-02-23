import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres } from "../drizzle/schema";

async function checkCentreMaps() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const centres = await db.select().from(shoppingCentres);
  
  console.log('Centres with direct map URLs:\n');
  centres.forEach(centre => {
    console.log(`${centre.name}:`);
    console.log(`  Centre Map: ${centre.mapImageUrl || '❌ None'}`);
  });
  
  await pool.end();
}

checkCentreMaps().catch(console.error);