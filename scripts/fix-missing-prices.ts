import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites, shoppingCentres } from "../drizzle/schema";
import { eq, isNull, or, and, ne } from "drizzle-orm";

/**
 * Fix sites with missing prices.
 *
 * Strategy:
 *   1. If pricePerDay is set but pricePerWeek is null → set weekly = daily × 5
 *   2. If pricePerWeek is set but pricePerDay is null → set daily = weekly / 5
 *   3. If BOTH are null → derive from the median price of other sites at the
 *      same centre. If no siblings have prices either, skip (manual entry needed).
 *
 * Pass --dry-run to preview without writing.
 */
async function fixMissingPrices() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍 DRY RUN — no changes will be written\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Fetch sites with missing prices
  const missing = await db
    .select({
      siteId: sites.id,
      siteNumber: sites.siteNumber,
      centreId: sites.centreId,
      centreName: shoppingCentres.name,
      pricePerDay: sites.pricePerDay,
      pricePerWeek: sites.pricePerWeek,
    })
    .from(sites)
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(
      and(
        eq(sites.isActive, true),
        or(isNull(sites.pricePerDay), isNull(sites.pricePerWeek))
      )
    )
    .orderBy(shoppingCentres.name, sites.siteNumber);

  if (missing.length === 0) {
    console.log("✅ All active sites already have prices.");
    await pool.end();
    return;
  }

  console.log(`Found ${missing.length} active sites with missing prices.\n`);

  // Pre-fetch median prices per centre (from sites that DO have both prices)
  const centreIds = [...new Set(missing.map((s) => s.centreId))];
  const centreMedians = new Map<number, { daily: number; weekly: number }>();

  for (const centreId of centreIds) {
    const siblings = await db
      .select({ pricePerDay: sites.pricePerDay, pricePerWeek: sites.pricePerWeek })
      .from(sites)
      .where(
        and(
          eq(sites.centreId, centreId),
          eq(sites.isActive, true),
          // Only siblings with both prices
          // Use ne to check not null (Drizzle workaround)
        )
      );

    const withPrices = siblings.filter((s) => s.pricePerDay !== null && s.pricePerWeek !== null);
    if (withPrices.length > 0) {
      const dailies = withPrices.map((s) => parseFloat(s.pricePerDay!)).sort((a, b) => a - b);
      const weeklies = withPrices.map((s) => parseFloat(s.pricePerWeek!)).sort((a, b) => a - b);
      const mid = Math.floor(dailies.length / 2);
      centreMedians.set(centreId, {
        daily: dailies[mid],
        weekly: weeklies[mid],
      });
    }
  }

  let fixed = 0;
  let skipped = 0;

  for (const site of missing) {
    const hasDaily = site.pricePerDay !== null;
    const hasWeekly = site.pricePerWeek !== null;
    let newDaily: string | undefined;
    let newWeekly: string | undefined;
    let source: string;

    if (hasDaily && !hasWeekly) {
      // Derive weekly = daily × 5
      const daily = parseFloat(site.pricePerDay!);
      newWeekly = (daily * 5).toFixed(2);
      source = `daily ($${site.pricePerDay}) × 5`;
    } else if (!hasDaily && hasWeekly) {
      // Derive daily = weekly / 5
      const weekly = parseFloat(site.pricePerWeek!);
      newDaily = (weekly / 5).toFixed(2);
      source = `weekly ($${site.pricePerWeek}) ÷ 5`;
    } else {
      // Both null — use centre median
      const median = centreMedians.get(site.centreId);
      if (!median) {
        console.log(
          `⏭  ${site.centreName} / Site ${site.siteNumber} (id=${site.siteId}): SKIPPED — no sibling prices to derive from`
        );
        skipped++;
        continue;
      }
      newDaily = median.daily.toFixed(2);
      newWeekly = median.weekly.toFixed(2);
      source = `centre median ($${newDaily}/day, $${newWeekly}/week)`;
    }

    const updates: Record<string, string> = {};
    if (newDaily) updates.pricePerDay = newDaily;
    if (newWeekly) updates.pricePerWeek = newWeekly;

    console.log(
      `${dryRun ? "📋" : "✏️ "} ${site.centreName} / Site ${site.siteNumber} (id=${site.siteId}): ` +
        `set ${Object.entries(updates).map(([k, v]) => `${k}=$${v}`).join(", ")} ` +
        `[from ${source}]`
    );

    if (!dryRun) {
      await db.update(sites).set(updates).where(eq(sites.id, site.siteId));
    }
    fixed++;
  }

  console.log(
    `\n${dryRun ? "Would fix" : "Fixed"} ${fixed} sites. Skipped ${skipped}.`
  );

  await pool.end();
}

fixMissingPrices().catch(console.error);
