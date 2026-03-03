import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const USAGE_CATEGORIES = [
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

const THIRD_LINE_CATEGORIES = [
  "ATM",
  "Car Wash",
  "Charity Clothing Bins",
  "Digital Signage (Car Park, Ceiling, Floor)",
  "Door Decals",
  "Drink Vending",
  "Escalator Decals",
  "External Signage",
  "Floor Decals",
  "Food Vending",
  "Gumball/Bouncy Balls",
  "Hanging Banners",
  "Kiddie Rides",
  "Lockers",
  "Lolly Vending",
  "Marketing Boxes",
  "Marketing Signs",
  "Massage Chairs",
  "Motor Vehicles (Cars)",
  "Non-Digital Signage",
  "Phone Towers",
  "Photo Booths",
  "Public Phones",
  "Pull-Up Banners",
  "Skill Tester (Chance)",
  "Solar Panels",
  "Storage",
  "Toy Vending",
  "Washroom Signage",
  "Weight Scales",
];

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed — ensure DATABASE_URL is set");
    process.exit(1);
  }

  // --- Seed Usage Categories ---
  console.log("=== Casual Leasing (Usage) Categories ===");
  const existingUsage = await db.execute(sql`SELECT name FROM usage_categories`);
  const existingUsageNames = new Set((existingUsage.rows as any[]).map((r: any) => r.name));
  console.log(`Found ${existingUsageNames.size} existing categories`);

  let usageInserted = 0;
  let usageSkipped = 0;

  for (let i = 0; i < USAGE_CATEGORIES.length; i++) {
    const cat = USAGE_CATEGORIES[i];
    if (existingUsageNames.has(cat.name)) {
      console.log(`  SKIP: "${cat.name}"`);
      usageSkipped++;
    } else {
      await db.execute(
        sql`INSERT INTO usage_categories (name, "isFree", "displayOrder", "isActive", "createdAt")
            VALUES (${cat.name}, ${cat.isFree}, ${i + 1}, true, NOW())`
      );
      console.log(`  ADD:  "${cat.name}" (isFree=${cat.isFree})`);
      usageInserted++;
    }
  }
  console.log(`Usage: ${usageInserted} inserted, ${usageSkipped} skipped\n`);

  // --- Seed Third Line Categories ---
  console.log("=== Third Line Income Categories ===");
  const existingTL = await db.execute(sql`SELECT name FROM third_line_categories`);
  const existingTLNames = new Set((existingTL.rows as any[]).map((r: any) => r.name));
  console.log(`Found ${existingTLNames.size} existing categories`);

  let tlInserted = 0;
  let tlSkipped = 0;

  for (let i = 0; i < THIRD_LINE_CATEGORIES.length; i++) {
    const name = THIRD_LINE_CATEGORIES[i];
    if (existingTLNames.has(name)) {
      console.log(`  SKIP: "${name}"`);
      tlSkipped++;
    } else {
      await db.execute(
        sql`INSERT INTO third_line_categories (name, "displayOrder", "isActive", "createdAt", "updatedAt")
            VALUES (${name}, ${i + 1}, true, NOW(), NOW())`
      );
      console.log(`  ADD:  "${name}"`);
      tlInserted++;
    }
  }
  console.log(`Third Line: ${tlInserted} inserted, ${tlSkipped} skipped`);

  console.log("\nDone!");
  process.exit(0);
}

main();
