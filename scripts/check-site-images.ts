import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkSiteImages() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Find Site 2 at Carnes Hill (siteId would be different, let's search)
  const allSites = await db
    .select()
    .from(sites)
    .where(eq(sites.siteNumber, "Site 2"));
  
  console.log('Sites with siteNumber "Site 2":');
  allSites.forEach(site => {
    console.log(`\nSite ID: ${site.id}, Centre ID: ${site.centreId}`);
    console.log(`Image 1: ${site.imageUrl1 || 'EMPTY'}`);
    console.log(`Image 2: ${site.imageUrl2 || 'EMPTY'}`);
    console.log(`Image 3: ${site.imageUrl3 || 'EMPTY'}`);
    console.log(`Image 4: ${site.imageUrl4 || 'EMPTY'}`);
  });
  
  await pool.end();
}

checkSiteImages().catch(console.error);