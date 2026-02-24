import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function activateKogarah() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Check what column exists for active status
  const columns = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'shopping_centres' 
    AND column_name LIKE '%active%';
  `);
  
  console.log('Active-related columns:', columns.rows);
  
  // Check current Kogarah data
  const before = await db.execute(sql`SELECT id, name, "includeInMainSite" FROM shopping_centres WHERE id = 13;`);
  console.log('\nKogarah before:', before.rows[0]);
  
  await pool.end();
}

activateKogarah().catch(console.error);