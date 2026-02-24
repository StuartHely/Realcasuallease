import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq, inArray } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Categories to remove (from CSV)
const categoriesToRemove = [
  "Another Test Category",
  "Automotive",
  "Books & Stationery",
  "Charities Free",
  "Clothing & Fashion",
  "Community Groups",
  "Electrical",
  "Finance",
  "Fitness & Health",
  "Food",
  "Furniture",
  "Food and Beverage – sampling, specialty food items or temporary café set ups",
  "Government Free",
  "Gambling.",
  "Jewellery",
  "Other",
  "Pets",
  "Plants",
  "Real Estate",
  "Shoes",
  "Sporting Goods",
  "Technology",
  "Telecommunications",
  "Test Custom Category",
  "Test Free Category",
  "Tobacco",
  "Tourism",
  "Toys"
];

console.log(`Deactivating ${categoriesToRemove.length} categories...`);

let deactivated = 0;
let notFound = 0;

for (const categoryName of categoriesToRemove) {
  try {
    // Find category by name
    const existing = await db.select()
      .from(schema.usageCategories)
      .where(eq(schema.usageCategories.name, categoryName.trim()));
    
    if (existing.length > 0) {
      // Deactivate it
      await db.update(schema.usageCategories)
        .set({ isActive: false })
        .where(eq(schema.usageCategories.id, existing[0].id));
      
      console.log(`  ⏸️  Deactivated: ${categoryName}`);
      deactivated++;
    } else {
      console.log(`  ⚠️  Not found: ${categoryName}`);
      notFound++;
    }
  } catch (error) {
    console.log(`  ❌ Error processing ${categoryName}:`, error.message);
  }
}

console.log(`\n✅ Removal complete!`);
console.log(`   Categories deactivated: ${deactivated}`);
console.log(`   Categories not found: ${notFound}`);

// Show remaining active categories
const remaining = await db.select()
  .from(schema.usageCategories)
  .where(eq(schema.usageCategories.isActive, true));

console.log(`\n📋 Remaining active categories (${remaining.length}):`);
remaining.forEach(cat => {
  console.log(`   - ${cat.name}${cat.isFree ? ' (FREE)' : ''}`);
});

await connection.end();
