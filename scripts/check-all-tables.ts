import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function checkTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Check if usage_categories table exists and has any data
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM usage_categories;
    `);
    console.log('usage_categories table exists');
    console.log('Rows:', result.rows[0]);
  } catch (error) {
    console.log('usage_categories table issue:', error);
  }
  
  // List all tables
  const tables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  
  console.log('\nAll tables in database:');
  tables.rows.forEach((row: any) => {
    console.log(`- ${row.table_name}`);
  });
  
  await pool.end();
}

checkTables().catch(console.error);