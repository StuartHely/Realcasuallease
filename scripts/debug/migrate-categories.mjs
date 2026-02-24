import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// User's exact list of 34 categories
const correctCategories = [
  { name: "Alcohol", isFree: false, displayOrder: 1 },
  { name: "Art & Craft", isFree: false, displayOrder: 2 },
  { name: "Automotive", isFree: false, displayOrder: 3 },
  { name: "Baby & Toddler", isFree: false, displayOrder: 4 },
  { name: "Books & Stationery", isFree: false, displayOrder: 5 },
  { name: "Charities Free", isFree: true, displayOrder: 6 },
  { name: "Clothing & Fashion", isFree: false, displayOrder: 7 },
  { name: "Community Groups", isFree: false, displayOrder: 8 },
  { name: "Electrical", isFree: false, displayOrder: 9 },
  { name: "Entertainment", isFree: false, displayOrder: 10 },
  { name: "Finance", isFree: false, displayOrder: 11 },
  { name: "Fitness & Health", isFree: false, displayOrder: 12 },
  { name: "Food", isFree: false, displayOrder: 13 },
  { name: "Furniture", isFree: false, displayOrder: 14 },
  { name: "Gardening", isFree: false, displayOrder: 15 },
  { name: "Government Free", isFree: true, displayOrder: 16 },
  { name: "Homewares", isFree: false, displayOrder: 17 },
  { name: "Jewellery", isFree: false, displayOrder: 18 },
  { name: "Music", isFree: false, displayOrder: 19 },
  { name: "Pets", isFree: false, displayOrder: 20 },
  { name: "Photography", isFree: false, displayOrder: 21 },
  { name: "Plants", isFree: false, displayOrder: 22 },
  { name: "Real Estate", isFree: false, displayOrder: 23 },
  { name: "Renewable Energy", isFree: false, displayOrder: 24 },
  { name: "Shoes", isFree: false, displayOrder: 25 },
  { name: "Sporting Goods", isFree: false, displayOrder: 26 },
  { name: "Technology", isFree: false, displayOrder: 27 },
  { name: "Telecommunications", isFree: false, displayOrder: 28 },
  { name: "Tobacco", isFree: false, displayOrder: 29 },
  { name: "Tools", isFree: false, displayOrder: 30 },
  { name: "Tourism", isFree: false, displayOrder: 31 },
  { name: "Toys", isFree: false, displayOrder: 32 },
  { name: "Wellness", isFree: false, displayOrder: 33 },
  { name: "Other", isFree: false, displayOrder: 34 },
];

console.log(`Migrating to correct 34 categories...`);

// Get all existing categories
const existing = await db.select().from(schema.usageCategories);
console.log(`Found ${existing.length} existing categories`);

// Mark incorrect categories as inactive
const correctNames = correctCategories.map(c => c.name);
let deactivated = 0;

for (const cat of existing) {
  if (!correctNames.includes(cat.name)) {
    await db.update(schema.usageCategories)
      .set({ isActive: false })
      .where(eq(schema.usageCategories.id, cat.id));
    console.log(`  ⏸️  Deactivated: ${cat.name}`);
    deactivated++;
  }
}

// Add or update correct categories
let added = 0;
let updated = 0;

for (const category of correctCategories) {
  const existingCat = existing.find(c => c.name === category.name);
  
  if (existingCat) {
    // Update existing
    await db.update(schema.usageCategories)
      .set({
        isFree: category.isFree,
        displayOrder: category.displayOrder,
        isActive: true,
      })
      .where(eq(schema.usageCategories.id, existingCat.id));
    console.log(`  ✏️  Updated: ${category.name}`);
    updated++;
  } else {
    // Add new
    await db.insert(schema.usageCategories).values({
      name: category.name,
      isFree: category.isFree,
      displayOrder: category.displayOrder,
      isActive: true,
      createdAt: new Date(),
    });
    console.log(`  ✅ Added: ${category.name}${category.isFree ? ' (FREE)' : ''}`);
    added++;
  }
}

console.log(`\n✅ Migration complete!`);
console.log(`   Categories added: ${added}`);
console.log(`   Categories updated: ${updated}`);
console.log(`   Categories deactivated: ${deactivated}`);

await connection.end();
