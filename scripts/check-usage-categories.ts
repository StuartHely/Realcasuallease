import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { usageCategories } from "../drizzle/schema";

async function checkCategories() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const categories = await db
    .select()
    .from(usageCategories)
    .orderBy(usageCategories.displayOrder);
  
  console.log(`Found ${categories.length} usage categories:\n`);
  
  categories.forEach(cat => {
    console.log(`${cat.displayOrder}. ${cat.name} (ID: ${cat.id})`);
    console.log(`   Description: ${cat.description || 'None'}`);
    console.log(`   Free: ${cat.isFree ? 'YES' : 'NO'}`);
    console.log(`   Active: ${cat.isActive ? 'YES' : 'NO'}\n`);
  });
  
  await pool.end();
}

checkCategories().catch(console.error);