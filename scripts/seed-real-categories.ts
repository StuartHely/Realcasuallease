import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { usageCategories } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function seedRealCategories() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Clear existing categories
  await db.execute(sql`DELETE FROM usage_categories;`);
  console.log('Cleared existing categories\n');
  
  const categories = [
    { name: "Automotive (Vehicles, Cars)", isFree: false },
    { name: "Beauty and Cosmetics", isFree: false },
    { name: "Bedding and Furniture", isFree: false },
    { name: "Art & Craft", isFree: false },
    { name: "Boating and Marine", isFree: false },
    { name: "Books", isFree: false },
    { name: "Baby & Toddler", isFree: false },
    { name: "Calendars", isFree: false },
    { name: "Candles", isFree: false },
    { name: "Charities (Free)", isFree: true },
    { name: "Government (Free)", isFree: true },
    { name: "Charities (Paid)", isFree: false },
    { name: "Clothing", isFree: false },
    { name: "Discount Variety", isFree: false },
    { name: "Education / Recruitment / Training", isFree: false },
    { name: "Energy", isFree: false },
    { name: "Entertainment", isFree: false },
    { name: "Financial and Insurance Services", isFree: false },
    { name: "Fitness / Sporting Goods", isFree: false },
    { name: "Florist", isFree: false },
    { name: "Gardening", isFree: false },
    { name: "Food and Beverage", isFree: false },
    { name: "Homewares", isFree: false },
    { name: "Health and Well-Being", isFree: false },
    { name: "Home Improvements", isFree: false },
    { name: "Music", isFree: false },
    { name: "Household Goods", isFree: false },
    { name: "Internal - Marketing and Centre Management", isFree: false },
    { name: "Jewellery (Fashion) and Accessories", isFree: false },
    { name: "Photography", isFree: false },
    { name: "Jewellery (Fine)", isFree: false },
    { name: "News and Stationery", isFree: false },
    { name: "Pet Products", isFree: false },
    { name: "Pharmaceuticals", isFree: false },
    { name: "Real Estate / Property Developers", isFree: false },
    { name: "Shoes / Footwear", isFree: false },
    { name: "Technology and Telecommunications", isFree: false },
    { name: "Toys", isFree: false },
    { name: "Travel", isFree: false },
    { name: "Ugg Boots", isFree: false },
    { name: "Tools", isFree: false },
    { name: "Utilities", isFree: false },
    { name: "Wellness", isFree: false },
  ];
  
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    await db.insert(usageCategories).values({
      name: cat.name,
      description: null,
      displayOrder: i + 1,
      isFree: cat.isFree,
      isActive: true,
    });
    console.log(`✓ ${i + 1}. ${cat.name}${cat.isFree ? ' (FREE)' : ''}`);
  }
  
  console.log(`\n✅ Created ${categories.length} usage categories!`);
  await pool.end();
}

seedRealCategories().catch(console.error);