import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function checkColumns() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'shopping_centres'
    ORDER BY ordinal_position;
  `);
  
  console.log('shopping_centres columns:\n');
  result.rows.forEach((row: any) => {
    console.log(`${row.column_name} (${row.data_type})`);
  });
  
  await pool.end();
}

checkColumns().catch(console.error);