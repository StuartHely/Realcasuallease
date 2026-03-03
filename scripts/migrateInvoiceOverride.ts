/**
 * Data migration: invoiceOverride → paymentMethod consolidation
 *
 * Ensures all bookings with invoiceOverride=true have paymentMethod='invoice'.
 * Run BEFORE dropping the invoiceOverride column.
 *
 * Usage:
 *   Load .env then run: npx tsx scripts/migrateInvoiceOverride.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, ne } from "drizzle-orm";
import { bookings } from "../drizzle/schema";
import pg from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  // Find bookings with invoiceOverride=true but paymentMethod != 'invoice'
  // Note: invoiceOverride column must still exist when this script runs
  const mismatched = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      paymentMethod: bookings.paymentMethod,
    })
    .from(bookings)
    .where(
      and(
        // @ts-ignore — invoiceOverride column exists in DB but may be removed from schema
        eq(bookings.invoiceOverride, true),
        ne(bookings.paymentMethod, "invoice")
      )
    );

  console.log(`Found ${mismatched.length} bookings with invoiceOverride=true but paymentMethod!='invoice'`);

  for (const booking of mismatched) {
    console.log(`  Fixing ${booking.bookingNumber}: ${booking.paymentMethod} → invoice`);
    await db
      .update(bookings)
      .set({ paymentMethod: "invoice" })
      .where(eq(bookings.id, booking.id));
  }

  // Count total affected for reporting
  // @ts-ignore
  const allOverrides = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      // @ts-ignore
      eq(bookings.invoiceOverride, true)
    );

  console.log(`\nTotal bookings with invoiceOverride=true: ${allOverrides.length}`);
  console.log(`Records corrected: ${mismatched.length}`);
  console.log(`\nMigration complete. Safe to drop invoiceOverride column.`);

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
