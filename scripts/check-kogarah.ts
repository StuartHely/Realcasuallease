import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres } from "../drizzle/schema";
import { like } from "drizzle-orm";

async function checkKogarah() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const centres = await db
    .select()
    .from(shoppingCentres)
    .where(like(shoppingCentres.name, '%Kogarah%'));
  
  console.log('Kogarah centres found:\n');
  centres.forEach(centre => {
    console.log(`Name: ${centre.name}`);
    console.log(`ID: ${centre.id}`);
    console.log(`State: ${centre.state || '❌ NULL'}`);
    console.log(`Active: ${centre.isActive}`);
    console.log(`Include in main site: ${centre.includeInMainSite}`);
    console.log('---');
  });
  
  await pool.end();
}

checkKogarah().catch(console.error);