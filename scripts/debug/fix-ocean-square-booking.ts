import "dotenv/config";
import { getDb } from "../../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  // Find recent bookings at Ocean Square
  const result = await db.execute(sql`
    SELECT b.id, b."bookingNumber", b."siteId", b.status, b."paymentMethod", b."paidAt", b."createdAt",
           s."siteNumber", sc.name as centre_name
    FROM bookings b
    JOIN sites s ON s.id = b."siteId"
    JOIN shopping_centres sc ON sc.id = s."centreId"
    WHERE sc.name ILIKE '%Ocean%'
    ORDER BY b."createdAt" DESC
    LIMIT 10
  `);

  console.log("Ocean Square bookings:");
  console.log(JSON.stringify(result.rows, null, 2));

  // Cancel any unpaid stripe bookings that are stuck
  const stuck = result.rows.filter(
    (r: any) => r.status !== "cancelled" && r.paymentMethod === "stripe" && !r.paidAt
  );

  if (stuck.length > 0) {
    console.log(`\nFound ${stuck.length} stuck Stripe booking(s). Cancelling...`);
    for (const b of stuck) {
      await db.execute(sql`UPDATE bookings SET status = 'cancelled', "cancelledAt" = NOW() WHERE id = ${(b as any).id}`);
      console.log(`  Cancelled booking ${(b as any).bookingNumber} (ID: ${(b as any).id})`);
    }
  } else {
    console.log("\nNo stuck Stripe bookings found.");
  }
}

main().catch(console.error).finally(() => process.exit(0));
