import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

async function generateSlugs() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const centres = await db.select().from(shoppingCentres);
  
  console.log(`Generating slugs for ${centres.length} centres...\n`);
  
  for (const centre of centres) {
    const slug = generateSlug(centre.name);
    
    await db
      .update(shoppingCentres)
      .set({ slug })
      .where(eq(shoppingCentres.id, centre.id));
    
    console.log(`✓ ${centre.name} → ${slug}`);
  }
  
  console.log(`\n✅ Generated ${centres.length} slugs!`);
  await pool.end();
}

generateSlugs().catch(console.error);