import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const CATEGORIES = [
  { name: "Art & Craft", isFree: false },
  { name: "Automotive (Vehicles, Cars)", isFree: false },
  { name: "Baby & Toddler", isFree: false },
  { name: "Beauty and Cosmetics", isFree: false },
  { name: "Bedding and Furniture", isFree: false },
  { name: "Boating and Marine", isFree: false },
  { name: "Books", isFree: false },
  { name: "Calendars", isFree: false },
  { name: "Candles", isFree: false },
  { name: "Charities (Free)", isFree: true },
  { name: "Charities (Paid)", isFree: false },
  { name: "Discount Variety", isFree: false },
  { name: "Education / Recruitment / Training", isFree: false },
  { name: "Energy", isFree: false },
  { name: "Entertainment", isFree: false },
  { name: "Financial and Insurance Services", isFree: false },
  { name: "Fitness / Sporting Goods", isFree: false },
  { name: "Florist (Fresh Flowers)", isFree: false },
  { name: "Food and Beverage", isFree: false },
  { name: "Gardening", isFree: false },
  { name: "Government (Free)", isFree: true },
  { name: "Health and Well-Being", isFree: false },
  { name: "Home Improvements", isFree: false },
  { name: "Homewares", isFree: false },
  { name: "Household Goods", isFree: false },
  { name: "Internal - Marketing and Centre Management", isFree: false },
  { name: "Jewellery (Fashion) and Accessories", isFree: false },
  { name: "Jewellery (Fine)", isFree: false },
  { name: "Ladies Fashion", isFree: false },
  { name: "Menswear", isFree: false },
  { name: "Mixed Fashion", isFree: false },
  { name: "Music", isFree: false },
  { name: "News and Stationery", isFree: false },
  { name: "Pet Products", isFree: false },
  { name: "Pharmaceuticals", isFree: false },
  { name: "Photography", isFree: false },
  { name: "Real Estate / Property Developers", isFree: false },
  { name: "Shoes / Footwear", isFree: false },
  { name: "Technology and Telecommunications", isFree: false },
  { name: "Tools", isFree: false },
  { name: "Toys", isFree: false },
  { name: "Travel", isFree: false },
  { name: "Ugg Boots", isFree: false },
  { name: "Utilities", isFree: false },
  { name: "Wellness", isFree: false },
];

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  // Get existing categories
  const existing = await db.execute(sql`SELECT name FROM usage_categories`);
  const existingNames = new Set((existing.rows as any[]).map((r: any) => r.name));

  console.log(`Found ${existingNames.size} existing categories`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    if (existingNames.has(cat.name)) {
      console.log(`  SKIP: "${cat.name}" (already exists)`);
      skipped++;
    } else {
      await db.execute(
        sql`INSERT INTO usage_categories (name, "isFree", "displayOrder", "isActive", "createdAt")
            VALUES (${cat.name}, ${cat.isFree}, ${i + 1}, true, NOW())`
      );
      console.log(`  ADD:  "${cat.name}" (isFree=${cat.isFree})`);
      inserted++;
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

main();
