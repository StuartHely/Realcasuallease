import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function fixKogarah() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Check current value
  const before = await db.execute(sql`SELECT id, name, "isActive" FROM shopping_centres WHERE id = 13;`);
  console.log('Before:', before.rows[0]);
  
  // Update with raw SQL
  await db.execute(sql`UPDATE shopping_centres SET "isActive" = true WHERE id = 13;`);
  
  // Check after
  const after = await db.execute(sql`SELECT id, name, "isActive" FROM shopping_centres WHERE id = 13;`);
  console.log('After:', after.rows[0]);
  
  await pool.end();
}

fixKogarah().catch(console.error);