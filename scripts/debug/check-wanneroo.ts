import pg from "pg";
const pool = new pg.Pool({ connectionString: "postgresql://postgres:password@localhost:5432/casuallease" });

async function main() {
  const floors = await pool.query(
    `SELECT * FROM floor_levels WHERE "centreId" = 9`
  );
  console.log("Floor levels for Wanneroo (id=9):", floors.rows.length, JSON.stringify(floors.rows));

  const sites = await pool.query(
    `SELECT id, "siteNumber", "floorLevelId" FROM sites WHERE "centreId" = 9`
  );
  console.log("Sites:", JSON.stringify(sites.rows));

  await pool.end();
}
main().catch(console.error);
