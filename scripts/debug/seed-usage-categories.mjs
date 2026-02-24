import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const categories = [
  { name: "Automotive", isFree: false, displayOrder: 1 },
  { name: "Beauty & Cosmetics", isFree: false, displayOrder: 2 },
  { name: "Boating & Marine", isFree: false, displayOrder: 3 },
  { name: "Books & Stationery", isFree: false, displayOrder: 4 },
  { name: "Charities (Free)", isFree: true, displayOrder: 5 },
  { name: "Charities (Paid)", isFree: false, displayOrder: 6 },
  { name: "Clothing & Fashion", isFree: false, displayOrder: 7 },
  { name: "Electronics & Technology", isFree: false, displayOrder: 8 },
  { name: "Financial Services", isFree: false, displayOrder: 9 },
  { name: "Fitness & Wellness", isFree: false, displayOrder: 10 },
  { name: "Food & Beverage", isFree: false, displayOrder: 11 },
  { name: "Furniture & Homewares", isFree: false, displayOrder: 12 },
  { name: "Gardening & Outdoor", isFree: false, displayOrder: 13 },
  { name: "Government (Free)", isFree: true, displayOrder: 14 },
  { name: "Health & Medical", isFree: false, displayOrder: 15 },
  { name: "Hobbies & Crafts", isFree: false, displayOrder: 16 },
  { name: "Home Improvement", isFree: false, displayOrder: 17 },
  { name: "Insurance", isFree: false, displayOrder: 18 },
  { name: "Jewellery & Accessories", isFree: false, displayOrder: 19 },
  { name: "Kids & Toys", isFree: false, displayOrder: 20 },
  { name: "Pets & Animals", isFree: false, displayOrder: 21 },
  { name: "Photography & Art", isFree: false, displayOrder: 22 },
  { name: "Real Estate", isFree: false, displayOrder: 23 },
  { name: "Renewable Energy", isFree: false, displayOrder: 24 },
  { name: "Security & Safety", isFree: false, displayOrder: 25 },
  { name: "Sports & Recreation", isFree: false, displayOrder: 26 },
  { name: "Telecommunications", isFree: false, displayOrder: 27 },
  { name: "Tourism & Travel", isFree: false, displayOrder: 28 },
  { name: "Trade Services", isFree: false, displayOrder: 29 },
  { name: "Utilities", isFree: false, displayOrder: 30 },
  { name: "Vaping & Smoking", isFree: false, displayOrder: 31 },
  { name: "Vehicles & Machinery", isFree: false, displayOrder: 32 },
  { name: "Wine & Liquor", isFree: false, displayOrder: 33 },
  { name: "Other", isFree: false, displayOrder: 34 },
];

console.log(`Seeding ${categories.length} usage categories...`);

let created = 0;
let skipped = 0;

for (const category of categories) {
  try {
    // Check if category already exists
    const existing = await db.select()
      .from(schema.usageCategories)
      .where(eq(schema.usageCategories.name, category.name));
    
    if (existing.length > 0) {
      console.log(`  ⏭️  Skipped: ${category.name} (already exists)`);
      skipped++;
      continue;
    }
    
    // Insert new category
    await db.insert(schema.usageCategories).values({
      name: category.name,
      isFree: category.isFree,
      displayOrder: category.displayOrder,
      isActive: true,
      createdAt: new Date(),
    });
    
    created++;
    console.log(`  ✅ Created: ${category.name}${category.isFree ? ' (FREE)' : ''}`);
  } catch (error) {
    console.log(`  ❌ Error creating ${category.name}:`, error.message);
  }
}

console.log(`\n✅ Seeding complete!`);
console.log(`   Categories created: ${created}`);
console.log(`   Categories skipped: ${skipped}`);
console.log(`   Total categories: ${created + skipped}`);

await connection.end();
