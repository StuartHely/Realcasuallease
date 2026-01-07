import mysql from "mysql2/promise";

/**
 * Generate a centre code from centre name
 * E.g., "Campbelltown Mall" -> "CampbelltownMall"
 * E.g., "Highlands Marketplace" -> "HighlandsMarketplace"
 */
function generateCentreCode(centreName) {
  // Remove special characters, keep alphanumeric and spaces
  const cleaned = centreName.replace(/[^a-zA-Z0-9\s]/g, '');
  // Remove extra spaces and convert to PascalCase
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const pascalCase = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  return pascalCase;
}

async function populateCentreCodes() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in environment");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // Get all centres
    const [centres] = await connection.execute(
      'SELECT id, name, centreCode FROM shopping_centres'
    );
    
    console.log(`Found ${centres.length} centres`);

    let updated = 0;
    let skipped = 0;

    for (const centre of centres) {
      if (centre.centreCode) {
        console.log(`  [SKIP] ${centre.name} - already has code: ${centre.centreCode}`);
        skipped++;
        continue;
      }

      const centreCode = generateCentreCode(centre.name);
      
      // Check if code already exists
      const [existing] = await connection.execute(
        'SELECT id FROM shopping_centres WHERE centreCode = ? AND id != ? LIMIT 1',
        [centreCode, centre.id]
      );

      let finalCode = centreCode;
      if (existing.length > 0) {
        // Code collision - append centre ID
        finalCode = `${centreCode}${centre.id}`;
        console.log(`  [UPDATE] ${centre.name} -> ${finalCode} (collision resolved)`);
      } else {
        console.log(`  [UPDATE] ${centre.name} -> ${finalCode}`);
      }

      await connection.execute(
        'UPDATE shopping_centres SET centreCode = ? WHERE id = ?',
        [finalCode, centre.id]
      );
      
      updated++;
    }

    console.log(`\n✅ Complete: ${updated} updated, ${skipped} skipped`);
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error populating centre codes:", error);
    await connection.end();
    process.exit(1);
  }
}

populateCentreCodes();
