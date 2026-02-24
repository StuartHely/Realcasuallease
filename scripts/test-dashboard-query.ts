import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";

async function testDashboard() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Test what getPermittedSiteIds returns for mega_admin
  const allSites = await db.select({ id: sites.id }).from(sites);
  console.log('Total sites in database:', allSites.length);
  console.log('Site IDs:', allSites.map(s => s.id));
  
  await pool.end();
}

testDashboard().catch(console.error);