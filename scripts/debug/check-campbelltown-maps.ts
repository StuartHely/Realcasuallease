import { getDb } from "../../server/db";
import { sites, shoppingCentres, floorLevels } from "../../drizzle/schema";
import { eq, like } from "drizzle-orm";

async function checkCampbelltownMaps() {
  const db = await getDb();
  
  // Find Campbelltown centre
  const centres = await db.select().from(shoppingCentres).where(like(shoppingCentres.name, "%Campbelltown%"));
  for (const c of centres) {
    console.log(`Centre: id=${c.id}, name="${c.name}", mapImageUrl="${c.mapImageUrl || 'NULL'}"`);
    
    // Floor levels
    const floors = await db.select().from(floorLevels).where(eq(floorLevels.centreId, c.id));
    console.log(`\nFloor levels (${floors.length}):`);
    for (const f of floors) {
      console.log(`  id=${f.id}, name="${f.levelName}", mapImageUrl="${f.mapImageUrl || 'NULL'}", isHidden=${f.isHidden}`);
    }
    
    // Sites with markers
    const siteRows = await db.select().from(sites).where(eq(sites.centreId, c.id));
    console.log(`\nSites (${siteRows.length}):`);
    for (const s of siteRows) {
      console.log(`  Site ${s.siteNumber}: floorLevelId=${s.floorLevelId}, markerX=${s.mapMarkerX}, markerY=${s.mapMarkerY}`);
    }
  }
  
  process.exit(0);
}

checkCampbelltownMaps().catch(console.error);
