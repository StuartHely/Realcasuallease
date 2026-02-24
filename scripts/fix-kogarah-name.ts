import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixKogarahName() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  await db
    .update(shoppingCentres)
    .set({ name: "Kogarah Town Centre" }) // Remove trailing space
    .where(eq(shoppingCentres.id, 13));
  
  console.log('✅ Fixed Kogarah name (removed trailing space)');
  
  await pool.end();
}

fixKogarahName().catch(console.error);