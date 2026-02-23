import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function checkCategoryTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  console.log('=== USAGE_CATEGORIES ===');
  const categories = await db.execute(sql`SELECT * FROM usage_categories ORDER BY "displayOrder";`);
  console.log(`Count: ${categories.rows.length}`);
  categories.rows.forEach((row: any) => {
    console.log(`- ${row.name} (ID: ${row.id}, Free: ${row.isFree || row.is_free})`);
  });
  
  console.log('\n=== USAGE_TYPES ===');
  const types = await db.execute(sql`SELECT * FROM usage_types;`);
  console.log(`Count: ${types.rows.length}`);
  types.rows.forEach((row: any) => {
    console.log(`- ${row.name} (ID: ${row.id})`);
  });
  
  console.log('\n=== SITE_USAGE_CATEGORIES (junction table) ===');
  const siteCategories = await db.execute(sql`SELECT COUNT(*) as count FROM site_usage_categories;`);
  console.log(`Count: ${siteCategories.rows[0].count}`);
  
  await pool.end();
}

checkCategoryTables().catch(console.error);