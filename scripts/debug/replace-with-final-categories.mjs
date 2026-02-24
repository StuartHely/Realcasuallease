import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Final 41 categories (from CSV)
const finalCategories = [
  { name: "Automotive", description: "Car or vehicle displays (usually in large open areas or car parks)", isFree: false },
  { name: "Beauty and Cosmetics", description: "Make up and Skincare products", isFree: false },
  { name: "Bedding and Furniture", description: "", isFree: false },
  { name: "Art & Craft", description: "", isFree: false },
  { name: "Boating and Marine", description: "", isFree: false },
  { name: "Books", description: "", isFree: false },
  { name: "Baby & Toddler", description: "", isFree: false },
  { name: "Calendars", description: "", isFree: false },
  { name: "Charities (Free)", description: "Nonprofit or Public Service information stands", isFree: true },
  { name: "Government (Free)", description: "Nonprofit or Public Service information stands", isFree: true },
  { name: "Charities (Paid)", description: "", isFree: false },
  { name: "Clothing", description: "Fashion and Apparel retailers", isFree: false },
  { name: "Discount Variety", description: "", isFree: false },
  { name: "Education / Recruitment / Training", description: "", isFree: false },
  { name: "Entertainment", description: "", isFree: false },
  { name: "Financial and Insurance Services", description: "", isFree: false },
  { name: "Fitness / Sporting Goods", description: "", isFree: false },
  { name: "Florist", description: "", isFree: false },
  { name: "Gardening", description: "", isFree: false },
  { name: "Food and Beverage", description: "e.g. kiosks, pop-up café's, seasonal food items", isFree: false },
  { name: "Homewares", description: "", isFree: false },
  { name: "Health and Well-Being", description: "Health products and services", isFree: false },
  { name: "Home Improvements", description: "", isFree: false },
  { name: "Music", description: "", isFree: false },
  { name: "Household Goods", description: "Products for the home", isFree: false },
  { name: "Internal - Marketing and Centre Management", description: "", isFree: false },
  { name: "Jewellery (Fashion) and Accessories", description: "", isFree: false },
  { name: "Photography", description: "", isFree: false },
  { name: "Jewellery (Fine)", description: "", isFree: false },
  { name: "News and Stationery", description: "", isFree: false },
  { name: "Pet Products", description: "", isFree: false },
  { name: "Renewable Energy", description: "", isFree: false },
  { name: "Pharmaceuticals", description: "", isFree: false },
  { name: "Real Estate / Property Developers", description: "", isFree: false },
  { name: "Shoes / Footwear", description: "", isFree: false },
  { name: "Technology and Telecommunications", description: "Phone accessories, repairs or phone service providers", isFree: false },
  { name: "Toys", description: "", isFree: false },
  { name: "Travel", description: "", isFree: false },
  { name: "Ugg Boots", description: "", isFree: false },
  { name: "Tools", description: "", isFree: false },
  { name: "Utilities", description: "", isFree: false },
  { name: "Wellness", description: "", isFree: false },
];

console.log(`Replacing all categories with final 41 categories...`);

// Step 1: Deactivate ALL existing categories
console.log(`\n1️⃣ Deactivating all existing categories...`);
const allExisting = await db.select().from(schema.usageCategories);
for (const cat of allExisting) {
  await db.update(schema.usageCategories)
    .set({ isActive: false })
    .where(eq(schema.usageCategories.id, cat.id));
}
console.log(`   ✅ Deactivated ${allExisting.length} existing categories`);

// Step 2: Create new 41 categories
console.log(`\n2️⃣ Creating 41 new categories...`);
let created = 0;
let updated = 0;

for (let i = 0; i < finalCategories.length; i++) {
  const category = finalCategories[i];
  
  // Check if category with this name already exists (even if inactive)
  const existing = await db.select()
    .from(schema.usageCategories)
    .where(eq(schema.usageCategories.name, category.name));
  
  if (existing.length > 0) {
    // Reactivate and update existing category
    await db.update(schema.usageCategories)
      .set({
        isActive: true,
        isFree: category.isFree,
        displayOrder: i + 1,
      })
      .where(eq(schema.usageCategories.id, existing[0].id));
    
    console.log(`   ♻️  Reactivated: ${category.name}${category.isFree ? ' (FREE)' : ''}`);
    updated++;
  } else {
    // Create new category
    await db.insert(schema.usageCategories).values({
      name: category.name,
      isFree: category.isFree,
      displayOrder: i + 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`   ✅ Created: ${category.name}${category.isFree ? ' (FREE)' : ''}`);
    created++;
  }
}

console.log(`\n✅ Replacement complete!`);
console.log(`   New categories created: ${created}`);
console.log(`   Existing categories reactivated: ${updated}`);

// Show final active categories
const active = await db.select()
  .from(schema.usageCategories)
  .where(eq(schema.usageCategories.isActive, true));

console.log(`\n📋 Final active categories (${active.length}):`);
active
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .forEach(cat => {
    console.log(`   ${cat.displayOrder}. ${cat.name}${cat.isFree ? ' (FREE)' : ''}`);
  });

await connection.end();
