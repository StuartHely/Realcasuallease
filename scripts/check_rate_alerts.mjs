/**
 * Re-run the rate validator and report results.
 * Usage: node scripts/check_rate_alerts.mjs
 */
import "dotenv/config";
import { checkSiteRates } from "../server/rateValidator.ts";

const alerts = await checkSiteRates();

if (alerts.length === 0) {
  console.log("\n✅ All active sites have valid rates.");
} else {
  console.log(`\n⚠️  ${alerts.length} site(s) with invalid rates:\n`);
  for (const a of alerts) {
    console.log(`  • ${a.centreName} — ${a.siteName} (site #${a.siteNumber})`);
    if (a.invalidFields) {
      console.log(`    Invalid fields: ${a.invalidFields.join(", ")}`);
    }
  }
}

process.exit(0);
