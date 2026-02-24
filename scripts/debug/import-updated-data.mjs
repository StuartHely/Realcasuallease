import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { shoppingCentres, sites, bookings } from "./drizzle/schema.ts";
import fs from "fs";

const db = drizzle(process.env.DATABASE_URL);

async function importData() {
  console.log("Starting data import...");
  
  // Read the JSON data
  const rawData = fs.readFileSync("./import-data.json", "utf-8");
  const rows = JSON.parse(rawData);
  
  console.log(`Found ${rows.length} rows to import`);
  
  // Step 1: Clear existing data (except user data and test bookings)
  console.log("\n1. Clearing existing centres and sites...");
  await db.delete(sites);
  await db.delete(shoppingCentres);
  console.log("✓ Cleared existing data");
  
  // Step 2: Group rows by shopping centre
  const centreMap = new Map();
  
  for (const row of rows) {
    const centreName = row["Shopping Centre Name"];
    if (!centreName) continue;
    
    if (!centreMap.has(centreName)) {
      centreMap.set(centreName, {
        name: centreName,
        majors: row["Majors including Supermarkets, DDS, Mini Majors and Department Stores."] || "",
        specialtyCount: row["Number of Specialties (approx)"] || "",
        sites: [],
      });
    }
    
    // Add site to centre
    const siteNumber = row["Site Number"];
    if (siteNumber) {
      centreMap.get(centreName).sites.push({
        siteNumber: siteNumber.toString(),
        description: row["Site Description"] || "",
        size: row["Site Size"] || "",
        maxTables: (() => {
          const val = row["Maximum number of tables"];
          if (!val || val === "") return null;
          const parsed = parseInt(val);
          return isNaN(parsed) ? null : parsed;
        })(),
        powerAvailable: row["Power available"] || "No",
        restrictions: row["Restrictions"] || "",
      });
    }
  }
  
  console.log(`\n2. Found ${centreMap.size} unique shopping centres`);
  
  // Step 3: Import centres and sites
  let totalSites = 0;
  
  for (const [centreName, centreData] of centreMap.entries()) {
    console.log(`\n   Importing: ${centreName}`);
    
    // Create centre
    const centreResult = await db.insert(shoppingCentres).values({
      ownerId: 1,
      name: centreName,
      address: null,
      suburb: null,
      city: null,
      state: null,
      postcode: null,
      latitude: null,
      longitude: null,
      majors: centreData.majors,
      specialtyCount: centreData.specialtyCount,
      openingHours: null,
      contactEmail: null,
      contactPhone: null,
      websiteUrl: null,
    });
    
    const centreId = Number(centreResult[0].insertId);
    console.log(`   ✓ Created centre (ID: ${centreId})`);
    
    // Create sites for this centre
    for (const siteData of centreData.sites) {
      await db.insert(sites).values({
        centreId,
        siteNumber: siteData.siteNumber,
        description: siteData.description,
        size: siteData.size,
        maxTables: siteData.maxTables,
        powerAvailable: siteData.powerAvailable,
        restrictions: siteData.restrictions,
        pricePerDay: "150.00", // Default pricing
        pricePerWeek: "750.00",
        instantBooking: false,
        imageUrl1: null,
        imageUrl2: null,
        imageUrl3: null,
        imageUrl4: null,
      });
      totalSites++;
    }
    
    console.log(`   ✓ Created ${centreData.sites.length} sites`);
  }
  
  console.log(`\n3. Import complete!`);
  console.log(`   Total centres: ${centreMap.size}`);
  console.log(`   Total sites: ${totalSites}`);
  
  // Step 4: Verify import
  const allCentres = await db.select().from(shoppingCentres);
  const allSites = await db.select().from(sites);
  
  console.log(`\n4. Verification:`);
  console.log(`   Centres in database: ${allCentres.length}`);
  console.log(`   Sites in database: ${allSites.length}`);
  
  console.log("\n✅ Data import successful!");
}

importData().catch((error) => {
  console.error("❌ Import failed:", error);
  process.exit(1);
});
