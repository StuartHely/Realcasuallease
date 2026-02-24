import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkDeagon() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const deagonSites = await db.select().from(sites).where(eq(sites.centreId, 16)); // Deagon
  
  console.log('Deagon site descriptions:\n');
  deagonSites.forEach(site => {
    console.log(`Site ${site.siteNumber}:`);
    console.log(`  "${site.description}"`);
    console.log(`  Has &amp;: ${site.description?.includes('&amp;')}`);
    console.log(`  Has &nbsp;: ${site.description?.includes('&nbsp;')}\n`);
  });
  
  await pool.end();
}

checkDeagon().catch(console.error);