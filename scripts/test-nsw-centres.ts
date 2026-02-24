import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function testNSW() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const nswCentres = await db
    .select()
    .from(shoppingCentres)
    .where(eq(shoppingCentres.state, "NSW"));
  
  console.log(`NSW centres: ${nswCentres.length}\n`);
  nswCentres.forEach(centre => {
    console.log(`- ${centre.name} (ID: ${centre.id})`);
  });
  
  await pool.end();
}

testNSW().catch(console.error);