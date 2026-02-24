import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres, sites, floorLevels } from "../drizzle/schema";
import { like, eq } from "drizzle-orm";

async function checkDeagon() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Find Deagon
  const centres = await db.select().from(shoppingCentres).where(like(shoppingCentres.name, '%Deagon%'));
  
  if (centres.length === 0) {
    console.log('❌ Deagon not found');
    await pool.end();
    return;
  }
  
  const deagon = centres[0];
  console.log(`✅ Found: ${deagon.name} (ID: ${deagon.id})`);
  console.log(`   Centre map: ${deagon.mapImageUrl || '❌ None'}\n`);
  
  // Check floor levels
  const floors = await db.select().from(floorLevels).where(eq(floorLevels.centreId, deagon.id));
  console.log(`Floor levels: ${floors.length}`);
  floors.forEach(floor => {
    console.log(`  - ${floor.levelName} (ID: ${floor.id})`);
    console.log(`    Map: ${floor.mapImageUrl || '❌ None'}`);
  });
  
  // Check sites
  const deagonSites = await db.select().from(sites).where(eq(sites.centreId, deagon.id));
  console.log(`\nSites: ${deagonSites.length}`);
  
  deagonSites.forEach(site => {
    console.log(`\nSite ${site.siteNumber} (ID: ${site.id})`);
    console.log(`  Description: "${site.description}"`);
    console.log(`  Floor Level ID: ${site.floorLevelId || '❌ Not assigned'}`);
    console.log(`  Coordinates: x=${site.xCoordinate || 'null'}, y=${site.yCoordinate || 'null'}`);
  });
  
  await pool.end();
}

checkDeagon().catch(console.error);