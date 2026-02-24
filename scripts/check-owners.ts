import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres, users } from "../drizzle/schema";

async function checkOwners() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const centres = await db.select().from(shoppingCentres);
  const adminUsers = await db.select().from(users);
  
  console.log('Admin users:');
  adminUsers.forEach(u => console.log(`- ${u.name} (ID: ${u.id}, Role: ${u.role})`));
  
  console.log('\nCentres and owners:');
  centres.forEach(c => console.log(`- ${c.name} (ID: ${c.id}): Owner ID ${c.ownerId}`));
  
  await pool.end();
}

checkOwners().catch(console.error);