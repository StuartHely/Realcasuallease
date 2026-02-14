/**
 * Seed script to create default admin user for username/password authentication.
 * 
 * Default credentials (CHANGE THESE IN PRODUCTION):
 *   Username: admin
 *   Password: admin123
 * 
 * Run with: npx tsx scripts/seed-admin-user.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { users } from "../drizzle/schema";

const SALT_ROUNDS = 10;

async function seedAdminUser() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = drizzle(databaseUrl);

  const adminUsername = "admin";
  const adminPassword = "admin123";

  console.log("Checking for existing admin user...");

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, adminUsername))
    .limit(1);

  if (existingUser.length > 0) {
    console.log("Admin user already exists. Updating password...");
    
    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    
    await db
      .update(users)
      .set({
        passwordHash,
        role: "mega_admin",
        updatedAt: new Date(),
      })
      .where(eq(users.username, adminUsername));

    console.log("Admin user password updated successfully.");
  } else {
    console.log("Creating admin user...");

    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    const openId = `local_${nanoid(16)}`;

    await db.insert(users).values({
      openId,
      username: adminUsername,
      passwordHash,
      name: "System Administrator",
      email: "admin@casuallease.local",
      role: "mega_admin",
      loginMethod: "password",
    });

    console.log("Admin user created successfully.");
  }

  console.log("\n===========================================");
  console.log("DEFAULT ADMIN CREDENTIALS");
  console.log("===========================================");
  console.log(`Username: ${adminUsername}`);
  console.log(`Password: ${adminPassword}`);
  console.log("===========================================");
  console.log("\n⚠️  IMPORTANT: Change these credentials in production!");
  console.log("You can update the password by running this script again");
  console.log("after modifying the adminPassword variable.\n");

  process.exit(0);
}

seedAdminUser().catch((error) => {
  console.error("Failed to seed admin user:", error);
  process.exit(1);
});
