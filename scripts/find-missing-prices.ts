import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites, shoppingCentres } from "../drizzle/schema";
import { eq, isNull, or } from "drizzle-orm";

async function findMissingPrices() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Finding sites with missing price data...\n");

  // Find sites where pricePerDay OR pricePerWeek is null
  const sitesWithMissing = await db
    .select({
      siteId: sites.id,
      siteNumber: sites.siteNumber,
      centreId: sites.centreId,
      centreName: shoppingCentres.name,
      pricePerDay: sites.pricePerDay,
      pricePerWeek: sites.pricePerWeek,
      weekendPricePerDay: sites.weekendPricePerDay,
      outgoingsPerDay: sites.outgoingsPerDay,
      isActive: sites.isActive,
    })
    .from(sites)
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(
      or(
        isNull(sites.pricePerDay),
        isNull(sites.pricePerWeek)
      )
    )
    .orderBy(shoppingCentres.name, sites.siteNumber);

  if (sitesWithMissing.length === 0) {
    console.log("✅ All sites have price data set!");
    await pool.end();
    return;
  }

  console.log(`Found ${sitesWithMissing.length} sites with missing prices:\n`);

  // Group by centre for readability
  const grouped = new Map<string, typeof sitesWithMissing>();
  for (const site of sitesWithMissing) {
    const key = site.centreName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(site);
  }

  for (const [centreName, centreSites] of grouped) {
    console.log(`\n📍 ${centreName} (${centreSites.length} sites):`);
    for (const site of centreSites) {
      const daily = site.pricePerDay ?? "MISSING";
      const weekly = site.pricePerWeek ?? "MISSING";
      const weekend = site.weekendPricePerDay ?? "—";
      const outgoings = site.outgoingsPerDay ?? "—";
      const active = site.isActive ? "" : " [INACTIVE]";
      console.log(
        `  Site ${site.siteNumber} (id=${site.siteId}): daily=$${daily}, weekly=$${weekly}, weekend=$${weekend}, outgoings=$${outgoings}${active}`
      );
    }
  }

  console.log(`\nTotal: ${sitesWithMissing.length} sites across ${grouped.size} centres`);
  console.log("\nTo fix, run: npx tsx scripts/fix-missing-prices.ts");

  await pool.end();
}

findMissingPrices().catch(console.error);
