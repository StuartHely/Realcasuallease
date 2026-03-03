import { getDb, generateSlug } from "./db";
import { shoppingCentres } from "../drizzle/schema";
import { eq, isNull } from "drizzle-orm";

export async function backfillCentreSlugs(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[SlugMigration] Database not available, skipping backfill");
    return;
  }

  const centresWithoutSlugs = await db
    .select({ id: shoppingCentres.id, name: shoppingCentres.name, slug: shoppingCentres.slug })
    .from(shoppingCentres)
    .where(isNull(shoppingCentres.slug));

  if (centresWithoutSlugs.length === 0) {
    console.log("[SlugMigration] All centres already have slugs");
    return;
  }

  console.log(`[SlugMigration] Backfilling slugs for ${centresWithoutSlugs.length} centres...`);

  const usedSlugs = new Set<string>();

  // Pre-load existing slugs to avoid conflicts
  const existingSlugs = await db
    .select({ slug: shoppingCentres.slug })
    .from(shoppingCentres);
  for (const row of existingSlugs) {
    if (row.slug) usedSlugs.add(row.slug);
  }

  for (const centre of centresWithoutSlugs) {
    let slug = generateSlug(centre.name);
    let candidate = slug;
    let counter = 1;

    while (usedSlugs.has(candidate)) {
      counter++;
      candidate = `${slug}-${counter}`;
    }

    usedSlugs.add(candidate);

    await db
      .update(shoppingCentres)
      .set({ slug: candidate })
      .where(eq(shoppingCentres.id, centre.id));

    console.log(`[SlugMigration] ${centre.name} → ${candidate}`);
  }

  console.log(`[SlugMigration] Done. Backfilled ${centresWithoutSlugs.length} centres.`);
}
