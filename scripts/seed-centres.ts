import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres, sites, owners } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const stateMap: Record<string, string> = { "Highlands Marketplace": "NSW", "Campbelltown Mall": "NSW", "Carnes Hill Marketplace": "NSW", "Pacific Square": "NSW", "Wanneroo Central": "WA", "Rockdale Plaza": "NSW", "Bass Hill Plaza": "NSW" };
const suburbMap: Record<string, string> = { "Highlands Marketplace": "Mittagong", "Campbelltown Mall": "Campbelltown", "Carnes Hill Marketplace": "Carnes Hill", "Pacific Square": "Maroubra", "Wanneroo Central": "Wanneroo", "Rockdale Plaza": "Rockdale", "Bass Hill Plaza": "Bass Hill" };
async function seedCentres() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  console.log("Seeding centres...");
  const existingOwners = await db.select().from(owners).limit(1);
  let ownerId: number;
  if (existingOwners.length > 0) {
    ownerId = existingOwners[0].id;
    console.log(`Using existing owner ID: ${ownerId}`);
  } else {
    const [newOwner] = await db.insert(owners).values({ name: "Default Owner" }).returning({ id: owners.id });
    ownerId = newOwner.id;
    console.log(`Created default owner ID: ${ownerId}`);
  }
  const rawData = readFileSync(join(__dirname, "sample_data_clean.json"), "utf-8").replace(/^\uFEFF/, "");
  const rows = JSON.parse(rawData);
  const centreMap = new Map<string, any[]>();
  for (const row of rows) {
    const name = row["Shopping Centre Name"];
    if (!name || name === "Shopping Centre Name") continue;
    if (!centreMap.has(name)) centreMap.set(name, []);
    centreMap.get(name)!.push(row);
  }
  for (const [centreName, centreRows] of centreMap) {
    const existing = await db.select().from(shoppingCentres).where(eq(shoppingCentres.name, centreName));
    let centreId: number;
    if (existing.length > 0) {
      centreId = existing[0].id;
      console.log(`Exists: ${centreName}`);
    } else {
      const [newCentre] = await db.insert(shoppingCentres).values({ name: centreName, ownerId, suburb: suburbMap[centreName] || "", state: stateMap[centreName] || "NSW", majors: centreRows[0]["Majors"] || "", includeInMainSite: true }).returning({ id: shoppingCentres.id });
      centreId = newCentre.id;
      console.log(`Created: ${centreName}`);
    }
    for (const row of centreRows) {
      const siteNumber = row["Site Number"];
      if (!siteNumber) continue;
      const existingSites = await db.select().from(sites).where(eq(sites.centreId, centreId));
      if (!existingSites.some(s => s.siteNumber === siteNumber.toString())) {
        await db.insert(sites).values({ centreId, siteNumber: siteNumber.toString(), description: row["Site Description"] || "", size: row["Site Size"] || "", powerAvailable: (row["Power available"] || "").toLowerCase().includes("power") || (row["Power available"] || "").toLowerCase() === "yes", restrictions: row["Restrictions"] || null, isActive: true });
        console.log(`  Site ${siteNumber}`);
      }
    }
  }
  console.log("Done!");
  await pool.end();
}
seedCentres().catch(console.error);
