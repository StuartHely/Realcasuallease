import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function checkKogarahState() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const result = await db.execute(sql`
    SELECT id, name, state, LENGTH(state) as state_length
    FROM shopping_centres 
    WHERE id = 13;
  `);
  
  const kogarah = result.rows[0];
  console.log('Kogarah state details:');
  console.log(`State value: "${kogarah.state}"`);
  console.log(`State length: ${kogarah.state_length}`);
  console.log(`Has trailing space: ${kogarah.state !== kogarah.state.trim()}`);
  
  // Try to update it
  await db.execute(sql`UPDATE shopping_centres SET state = 'NSW' WHERE id = 13;`);
  console.log('\n✅ Updated state to clean "NSW"');
  
  await pool.end();
}

checkKogarahState().catch(console.error);