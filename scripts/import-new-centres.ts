import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import * as db from '../server/db';

const CSV_PATH = '/home/ubuntu/upload/Dataforcasualleasesoftware1.csv';

async function importNewCentres() {
  const records: any[] = [];
  
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
  
  // Debug: show last 3 rows
  console.log('\nDebug - Last 3 rows:');
  records.slice(-3).forEach((r, i) => {
    console.log(`Row ${records.length - 3 + i}:`, {
      'Shopping Centre Name': r['Shopping Centre Name'],
      'Site Number': r['Site Number'],
      'Site Description': r['Site Description'],
      'Street Address': r['Street Address'],
      'Latitude': r['Latitude'],
      'Longitude': r['Longitude'],
    });
  });

  // Find rows that are new centres
  // For new centres, the columns are shifted:
  // - 'Shopping Centre Name' = centre name
  // - 'Site Number' = address (because Site Number column is empty, CSV shifts data left)
  // - 'Site Description' = latitude
  // - 'Site Size' = longitude
  const newCentres: Array<{ name: string; address: string; latitude: string; longitude: string }> = [];
  
  for (const record of records) {
    const centreName = record['Shopping Centre Name']?.trim();
    const possibleAddress = record['Site Number']?.trim();
    const possibleLat = record['Site Description']?.trim();
    const possibleLon = record['Site Size']?.trim();

    // Check if this looks like a new centre (address contains comma, lat/lon are numbers)
    if (centreName && possibleAddress && possibleLat && possibleLon) {
      // Validate that lat/lon look like coordinates (negative numbers with decimals)
      const latNum = parseFloat(possibleLat);
      const lonNum = parseFloat(possibleLon);
      
      if (!isNaN(latNum) && !isNaN(lonNum) && Math.abs(latNum) < 90 && Math.abs(lonNum) < 180) {
        // Check if we've already added this centre
        const exists = newCentres.find(c => c.name === centreName);
        if (!exists) {
          newCentres.push({
            name: centreName,
            address: possibleAddress,
            latitude: possibleLat,
            longitude: possibleLon,
          });
        }
      }
    }
  }

  console.log(`Found ${newCentres.length} new centres to import`);

  // Get default owner ID (we'll use owner ID 1 for now)
  const defaultOwnerId = 1;

  // Import each new centre
  let imported = 0;
  let skipped = 0;

  for (const centre of newCentres) {
    try {
      // Check if centre already exists
      const existing = await db.getCentreByName(centre.name);
      
      if (existing) {
        console.log(`⊘ Skipped (already exists): ${centre.name}`);
        skipped++;
        continue;
      }

      // Extract state from address
      const stateMatch = centre.address.match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/);
      const state = stateMatch ? stateMatch[1] : null;

      // Create new centre
      await db.createCentre({
        ownerId: defaultOwnerId,
        name: centre.name,
        address: centre.address,
        state: state,
        latitude: centre.latitude,
        longitude: centre.longitude,
        includeInMainSite: true,
      });

      console.log(`✓ Imported: ${centre.name} (${centre.latitude}, ${centre.longitude})`);
      imported++;
    } catch (error: any) {
      console.error(`✗ Error importing ${centre.name}:`, error.message);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Imported: ${imported} new centres`);
  console.log(`Skipped (already exist): ${skipped} centres`);
  console.log(`Total centres in CSV: ${newCentres.length}`);
}

importNewCentres()
  .then(() => {
    console.log('\nNew centre import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
