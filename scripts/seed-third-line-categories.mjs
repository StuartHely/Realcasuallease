import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const initialCategories = [
  "ATM",
  "Car Wash",
  "Charity Clothing Bins",
  "Digital Signage (Car Park)",
  "Digital Signage (Ceiling)",
  "Digital Signage (Floor)",
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
  "Weight Scales"
];

async function seedCategories() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Seeding Third Line Income categories...");

  for (let i = 0; i < initialCategories.length; i++) {
    const name = initialCategories[i];
    try {
      await connection.execute(
        `INSERT INTO third_line_categories (name, displayOrder, isActive, createdAt, updatedAt) 
         VALUES (?, ?, true, NOW(), NOW()) 
         ON DUPLICATE KEY UPDATE displayOrder = VALUES(displayOrder)`,
        [name, i + 1]
      );
      console.log(`  ✓ ${name}`);
    } catch (error) {
      console.log(`  ⚠ ${name} - ${error.message}`);
    }
  }

  console.log(`\nSeeded ${initialCategories.length} categories.`);
  await connection.end();
}

seedCategories().catch(console.error);
