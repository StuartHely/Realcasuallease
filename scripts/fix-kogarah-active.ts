import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixKogarah() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  await db
    .update(shoppingCentres)
    .set({ isActive: true })
    .where(eq(shoppingCentres.id, 13));
  
  console.log('✅ Set Kogarah Town Centre to active!');
  
  await pool.end();
}

fixKogarah().catch(console.error);