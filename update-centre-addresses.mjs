import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { shoppingCentres } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const centreUpdates = [
  {
    name: "Highlands Marketplace",
    address: "197 Old Hume Hwy",
    suburb: "Mittagong",
    city: "Mittagong",
    state: "NSW",
    postcode: "2575"
  },
  {
    name: "Campbelltown Mall",
    address: "271 Queen Street",
    suburb: "Campbelltown",
    city: "Campbelltown",
    state: "NSW",
    postcode: "2560"
  },
  {
    name: "Carnes Hill Marketplace",
    address: "Cnr Cowpasture and Kurrajong Roads",
    suburb: "Horningsea Park",
    city: "Horningsea Park",
    state: "NSW",
    postcode: "2171"
  },
  {
    name: "Pacific Square",
    address: "Cnr Anzac Parade & Maroubra Road",
    suburb: "Maroubra Junction",
    city: "Maroubra",
    state: "NSW",
    postcode: "2035"
  },
  {
    name: "Wanneroo Central",
    address: "950 Wanneroo Road",
    suburb: "Wanneroo",
    city: "Wanneroo",
    state: "WA",
    postcode: "6065"
  },
  {
    name: "Rockdale Plaza",
    address: "1 Rockdale Plaza Drive",
    suburb: "Rockdale",
    city: "Rockdale",
    state: "NSW",
    postcode: "2216"
  },
  {
    name: "Bass Hill Plaza",
    address: "753 Hume Highway",
    suburb: "Bass Hill",
    city: "Bass Hill",
    state: "NSW",
    postcode: "2197"
  },
  {
    name: "Corio Village",
    address: "Bacchus Marsh Rd and Purnell Road",
    suburb: "Corio",
    city: "Corio",
    state: "VIC",
    postcode: "3214"
  }
];

console.log("Updating shopping centre addresses...\n");

for (const update of centreUpdates) {
  try {
    const result = await db
      .update(shoppingCentres)
      .set({
        address: update.address,
        suburb: update.suburb,
        city: update.city,
        state: update.state,
        postcode: update.postcode
      })
      .where(eq(shoppingCentres.name, update.name));
    
    console.log(`✓ Updated ${update.name} - ${update.state}`);
  } catch (error) {
    console.error(`✗ Failed to update ${update.name}:`, error.message);
  }
}

console.log("\n✅ All centres updated successfully!");
process.exit(0);
