import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bookings, centreBudgets } from "../drizzle/schema";

async function checkData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const allBookings = await db.select().from(bookings);
  const allBudgets = await db.select().from(centreBudgets);
  
  console.log(`Total bookings: ${allBookings.length}`);
  if (allBookings.length > 0) {
    console.log('Latest booking:', allBookings[allBookings.length - 1]);
  }
  
  console.log(`\nTotal budgets: ${allBudgets.length}`);
  if (allBudgets.length > 0) {
    console.log('Latest budget:', allBudgets[allBudgets.length - 1]);
  }
  
  await pool.end();
}

checkData().catch(console.error);