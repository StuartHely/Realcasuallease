import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function checkAllFloorLevels() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const result = await db.execute(sql`
    SELECT fl.id, fl."levelName", fl."mapImageUrl", sc.name as centre_name
    FROM floor_levels fl
    JOIN shopping_centres sc ON fl."centreId" = sc.id
    ORDER BY sc.name, fl."displayOrder";
  `);
  
  console.log('All floor levels in database:\n');
  result.rows.forEach((row: any) => {
    console.log(`${row.centre_name} - ${row.levelName}`);
    console.log(`  Map: ${row.mapImageUrl || '❌ None'}`);
  });
  
  console.log(`\nTotal: ${result.rows.length} floor levels`);
  await pool.end();
}

checkAllFloorLevels().catch(console.error);