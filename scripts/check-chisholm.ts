import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres, sites, floorLevels } from "../drizzle/schema";
import { like, eq } from "drizzle-orm";

async function checkChisholm() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Find Chisholm centre
  const centres = await db
    .select()
    .from(shoppingCentres)
    .where(like(shoppingCentres.name, '%Chisholm%'));
  
  if (centres.length === 0) {
    console.log('❌ Chisholm Village not found');
    await pool.end();
    return;
  }
  
  const centre = centres[0];
  console.log(`Found: ${centre.name} (ID: ${centre.id})\n`);
  
  // Check floor levels
  const floors = await db
    .select()
    .from(floorLevels)
    .where(eq(floorLevels.centreId, centre.id));
  
  console.log(`Floor levels: ${floors.length}`);
  floors.forEach(floor => {
    console.log(`  - ${floor.levelName} (ID: ${floor.id}, Hidden: ${floor.isHidden})`);
  });
  
  // Check sites
  const chisholmSites = await db
    .select()
    .from(sites)
    .where(eq(sites.centreId, centre.id));
  
  console.log(`\nSites: ${chisholmSites.length}`);
  chisholmSites.forEach(site => {
    console.log(`\nSite ${site.siteNumber} (ID: ${site.id})`);
    console.log(`  Floor Level ID: ${site.floorLevelId || '❌ Not assigned'}`);
    console.log(`  Coordinates: x=${site.xCoordinate}, y=${site.yCoordinate}`);
  });
  
  await pool.end();
}

checkChisholm().catch(console.error);