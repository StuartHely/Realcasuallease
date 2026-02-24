import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function checkChisholmState() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const result = await db.execute(sql`
    SELECT id, name, state, LENGTH(state) as state_length, "includeInMainSite"
    FROM shopping_centres 
    WHERE name LIKE '%Chisholm%';
  `);
  
  if (result.rows.length === 0) {
    console.log('❌ Chisholm not found');
  } else {
    const chisholm = result.rows[0];
    console.log('Chisholm data:');
    console.log(`  Name: "${chisholm.name}"`);
    console.log(`  State: "${chisholm.state}" (length: ${chisholm.state_length})`);
    console.log(`  Include in main site: ${chisholm.includeInMainSite}`);
    console.log(`  Has trailing space: ${chisholm.state !== chisholm.state?.trim()}`);
    
    // Fix if needed
    await db.execute(sql`
      UPDATE shopping_centres 
      SET state = TRIM(state), "includeInMainSite" = true 
      WHERE id = ${chisholm.id};
    `);
    console.log('\n✅ Fixed state (trimmed) and set includeInMainSite = true');
  }
  
  await pool.end();
}

checkChisholmState().catch(console.error);