import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites, shoppingCentres, floorLevels } from "../drizzle/schema";
import { like, eq } from "drizzle-orm";

async function assignDeagonSites() {
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
  console.log(`Found: ${deagon.name} (ID: ${deagon.id})\n`);
  
  // Find Ground Floor
  const floors = await db.select().from(floorLevels).where(eq(floorLevels.centreId, deagon.id));
  if (floors.length === 0) {
    console.log('❌ No floor levels');
    await pool.end();
    return;
  }
  
  const groundFloor = floors[0];
  console.log(`Ground Floor: ${groundFloor.levelName} (ID: ${groundFloor.id})\n`);
  
  // Assign all sites to Ground Floor
  const deagonSites = await db.select().from(sites).where(eq(sites.centreId, deagon.id));
  
  for (const site of deagonSites) {
    await db.update(sites).set({ floorLevelId: groundFloor.id }).where(eq(sites.id, site.id));
    console.log(`✅ Assigned Site ${site.siteNumber} to ${groundFloor.levelName}`);
  }
  
  console.log(`\n✅ Assigned ${deagonSites.length} sites to Ground Floor!`);
  console.log('📍 Now go to Map Management to place them!');
  
  await pool.end();
}

assignDeagonSites().catch(console.error);