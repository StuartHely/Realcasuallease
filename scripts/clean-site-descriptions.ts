import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function cleanDescriptions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Get all sites with descriptions
  const allSites = await db.select().from(sites);
  
  let cleaned = 0;
  
  for (const site of allSites) {
    if (!site.description) continue;
    
    let clean = site.description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .trim();
    
    if (clean !== site.description) {
      await db.update(sites)
        .set({ description: clean })
        .where(sql`id = ${site.id}`);
      
      console.log(`✓ Site ${site.siteNumber}: "${site.description}" → "${clean}"`);
      cleaned++;
    }
  }
  
  console.log(`\n✅ Cleaned ${cleaned} site descriptions!`);
  await pool.end();
}

cleanDescriptions().catch(console.error);