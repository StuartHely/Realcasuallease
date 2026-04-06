import "dotenv/config";
import pg from "pg";

const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();
try {
  await client.query(`ALTER TABLE vacant_shops ALTER COLUMN "totalSizeM2" TYPE varchar(100) USING "totalSizeM2"::text`);
  console.log("Done: totalSizeM2 changed to varchar(100)");
} catch (e: any) {
  console.error("Error:", e.message);
} finally {
  await client.end();
}
