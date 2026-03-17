import "dotenv/config";
import { getDb } from "../../server/db";
import { floorLevels } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixCampbelltownMaps() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  // The map on floor 11 (Ground, hidden) is actually the Upper Level map (U-prefixed units)
  // Floor 13 (Upper Level) has 10 sites with markers but no map image
  // Fix: move the map to the correct floor level

  // 1. Set Upper Level (id=13) map to the Upper Level map image
  await db.update(floorLevels)
    .set({ mapImageUrl: "/maps/floor-levels/11-1772499919447.png" })
    .where(eq(floorLevels.id, 13));
  console.log("Updated Upper Level (id=13) with Upper Level map image");

  // 2. Revert Ground (id=11, hidden) to its older map (Lower Ground view)
  await db.update(floorLevels)
    .set({ mapImageUrl: "/maps/floor-levels/11-1772499840829.png" })
    .where(eq(floorLevels.id, 11));
  console.log("Reverted Ground (id=11) to its original map image");

  // Verify
  const floors = await db.select().from(floorLevels).where(eq(floorLevels.centreId, 7));
  for (const f of floors) {
    console.log(`  Floor "${f.levelName}" (id=${f.id}): mapImageUrl=${f.mapImageUrl}`);
  }

  process.exit(0);
}

fixCampbelltownMaps().catch(console.error);
