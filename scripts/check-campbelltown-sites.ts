import { getDb } from "../server/db";
import { sites, shoppingCentres } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

async function checkCampbelltownSites() {
  const db = await getDb();
  
  // Find Campbelltown centre
  const centres = await db.select().from(shoppingCentres).where(like(shoppingCentres.name, "%Campbelltown%"));
  console.log("Campbelltown centres:", centres.map(c => ({ id: c.id, name: c.name })));
  
  if (centres.length > 0) {
    const centreId = centres[0].id;
    const campSites = await db.select().from(sites).where(eq(sites.centreId, centreId));
    console.log("\nCampbelltown sites (first 5):");
    campSites.slice(0, 5).forEach(s => {
      console.log(`Site ${s.siteNumber}: size="${s.size}", maxTables=${s.maxTables}`);
    });
  }
}

checkCampbelltownSites().catch(console.error);
