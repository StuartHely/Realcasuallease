import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db.js';
import { shoppingCentres } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const CSV_PATH = '/home/ubuntu/upload/Dataforcasualleasesoftware1.csv';

async function importCoordinates() {
  const records = [];
  
  // Parse CSV
  const parser = createReadStream(CSV_PATH).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  for await (const record of parser) {
    records.push(record);
  }

  console.log(`Parsed ${records.length} rows from CSV`);

  // Group by centre name to get unique centres with coordinates
  const centreMap = new Map();
  
  for (const record of records) {
    const centreName = record['Shopping Centre Name']?.trim();
    const address = record['Street Address']?.trim();
    const lat = record['Latitude']?.trim();
    const lon = record['Longitude']?.trim();

    if (centreName && lat && lon) {
      if (!centreMap.has(centreName)) {
        centreMap.set(centreName, {
          name: centreName,
          address: address || null,
          latitude: lat,
          longitude: lon,
        });
      }
    }
  }

  console.log(`Found ${centreMap.size} unique centres with coordinates`);

  // Update existing centres
  let updated = 0;
  let notFound = [];

  for (const [centreName, data] of centreMap.entries()) {
    try {
      // Try to find existing centre by name
      const existing = await db.query.shoppingCentres.findFirst({
        where: eq(shoppingCentres.name, centreName),
      });

      if (existing) {
        await db
          .update(shoppingCentres)
          .set({
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address || existing.address,
          })
          .where(eq(shoppingCentres.id, existing.id));
        
        console.log(`✓ Updated: ${centreName} (${data.latitude}, ${data.longitude})`);
        updated++;
      } else {
        notFound.push(centreName);
      }
    } catch (error) {
      console.error(`Error updating ${centreName}:`, error.message);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated} centres`);
  console.log(`Not found (will be imported as new): ${notFound.length} centres`);
  
  if (notFound.length > 0) {
    console.log(`\nCentres to be imported:`);
    notFound.forEach(name => console.log(`  - ${name}`));
  }
}

importCoordinates()
  .then(() => {
    console.log('\nCoordinate import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
