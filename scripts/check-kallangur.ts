import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function checkKallangur() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const result = await db.execute(sql`
    SELECT id, name, state, LENGTH(state) as state_length, "includeInMainSite", "mapImageUrl"
    FROM shopping_centres 
    WHERE name LIKE '%Kallangur%';
  `);
  
  if (result.rows.length === 0) {
    console.log('❌ Kallangur not found');
  } else {
    const centre = result.rows[0];
    console.log('Kallangur data:');
    console.log(`  ID: ${centre.id}`);
    console.log(`  Name: "${centre.name}"`);
    console.log(`  State: "${centre.state}" (length: ${centre.state_length})`);
    console.log(`  Include in main site: ${centre.includeInMainSite}`);
    console.log(`  Centre map: ${centre.mapImageUrl || '❌ None'}`);
    console.log(`  Has trailing space in state: ${centre.state !== centre.state?.trim()}`);
    
    // Check floor levels
    const floors = await db.execute(sql`
      SELECT id, "levelName", "mapImageUrl"
      FROM floor_levels
      WHERE "centreId" = ${centre.id};
    `);
    
    console.log(`\nFloor levels: ${floors.rows.length}`);
    floors.rows.forEach((floor: any) => {
      console.log(`  - ${floor.levelName} (Map: ${floor.mapImageUrl || '❌ None'})`);
    });
    
    // Fix state and visibility
    await db.execute(sql`
      UPDATE shopping_centres 
      SET state = TRIM(state), "includeInMainSite" = true 
      WHERE id = ${centre.id};
    `);
    console.log('\n✅ Fixed state (trimmed) and set includeInMainSite = true');
  }
  
  await pool.end();
}

checkKallangur().catch(console.error);