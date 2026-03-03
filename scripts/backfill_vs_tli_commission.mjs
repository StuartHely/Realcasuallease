import "dotenv/config";
import pg from "pg";
const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();
const r1 = await client.query(`UPDATE owners SET "commissionVs" = '0.00' WHERE "commissionVs" IS NULL`);
console.log("commissionVs updated:", r1.rowCount);
const r2 = await client.query(`UPDATE owners SET "commissionTli" = '0.00' WHERE "commissionTli" IS NULL`);
console.log("commissionTli updated:", r2.rowCount);
await client.end();
