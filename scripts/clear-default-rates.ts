import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function clearDefaultRates() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  console.log("Clearing default rates from existing sites...");
  
  // Find sites with default values ($150 weekday, $750 weekly)
  const sitesWithDefaults = await db
    .select()
    .from(sites)
    .where(
      and(
        eq(sites.pricePerDay, "150.00"),
        eq(sites.pricePerWeek, "750.00")
      )
    );
  
  console.log(`Found ${sitesWithDefaults.length} sites with default rates`);
  
  // Set all three rates to null for these sites
  for (const site of sitesWithDefaults) {
    await db
      .update(sites)
      .set({
        pricePerDay: null,
        pricePerWeek: null,
        weekendPricePerDay: null,
      })
      .where(eq(sites.id, site.id));
  }
  
  console.log(`Cleared rates for ${sitesWithDefaults.length} sites`);
  console.log("Done!");
  
  await pool.end();
}

clearDefaultRates().catch(console.error);