import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites, shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function findCarnesSites() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Find Carnes Hill centre
  const centres = await db
    .select()
    .from(shoppingCentres)
    .where(eq(shoppingCentres.name, "Carnes Hill Marketplace"));
  
  if (centres.length === 0) {
    console.log('Carnes Hill Marketplace not found!');
    await pool.end();
    return;
  }
  
  const carnesCentreId = centres[0].id;
  console.log(`Carnes Hill Marketplace ID: ${carnesCentreId}\n`);
  
  // Get all sites at Carnes Hill
  const carnesSites = await db
    .select()
    .from(sites)
    .where(eq(sites.centreId, carnesCentreId));
  
  console.log(`Found ${carnesSites.length} sites at Carnes Hill:\n`);
  
  carnesSites.forEach(site => {
    console.log(`Site ${site.siteNumber} (ID: ${site.id})`);
    console.log(`  Image 1: ${site.imageUrl1 || 'EMPTY'}`);
    console.log(`  Image 2: ${site.imageUrl2 || 'EMPTY'}`);
    console.log(`  Image 3: ${site.imageUrl3 || 'EMPTY'}`);
    console.log(`  Image 4: ${site.imageUrl4 || 'EMPTY'}\n`);
  });
  
  await pool.end();
}

findCarnesSites().catch(console.error);