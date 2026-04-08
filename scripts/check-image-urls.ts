import pg from "pg";
const { Pool } = pg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/casuallease" });
  const res = await pool.query(`
    SELECT s.id, s."siteNumber", s."imageUrl1", sc.name as centre
    FROM sites s
    JOIN shopping_centres sc ON s."centreId" = sc.id
    WHERE s."imageUrl1" IS NOT NULL
    ORDER BY sc.name, s.id
  `);
  for (const row of res.rows) {
    console.log(`${row.centre} | Site ${row.siteNumber} | ${row.imageUrl1}`);
  }
  pool.end();
}
run().catch(console.error);
