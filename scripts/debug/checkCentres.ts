import { sql } from "drizzle-orm";
import { getDb } from "../../server/db";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }
  const r = await db.execute(sql`SELECT id, name, suburb, state FROM shopping_centres WHERE name ILIKE '%allang%' OR suburb ILIKE '%allang%'`);
  console.log("Matching centres:", JSON.stringify(r.rows, null, 2));
  const all = await db.execute(sql`SELECT id, name, suburb, state FROM shopping_centres ORDER BY name`);
  console.log("\nAll centres:", JSON.stringify(all.rows, null, 2));
  process.exit(0);
}
main();
