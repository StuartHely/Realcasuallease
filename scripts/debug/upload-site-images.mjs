import { drizzle } from 'drizzle-orm/mysql2';
import { sites, shoppingCentres } from './drizzle/schema.js';
import { eq, and } from 'drizzle-orm';
import { readFileSync, readdirSync } from 'fs';
import { storagePut } from './server/storage.js';
import { nanoid } from 'nanoid';

const db = drizzle(process.env.DATABASE_URL);

async function uploadSiteImages() {
  console.log('Starting site image upload...\n');

  const imageDir = '/home/ubuntu/upload/highlands_images';
  const imageFiles = readdirSync(imageDir);

  console.log(`Found ${imageFiles.length} images to process\n`);

  // Get Highlands Marketplace
  const centres = await db.select().from(shoppingCentres).where(
    eq(shoppingCentres.name, 'Highlands Marketplace')
  );

  if (centres.length === 0) {
    console.error('Highlands Marketplace not found');
    return;
  }

  const centre = centres[0];
  console.log(`Centre: ${centre.name} (ID: ${centre.id})\n`);

  for (const filename of imageFiles) {
    if (!filename.endsWith('.jpg') && !filename.endsWith('.jpeg') && !filename.endsWith('.png')) {
      continue;
    }

    console.log(`Processing: ${filename}`);

    // Extract site number from filename
    // Format: "Highlands Marketplace Site 8.jpg"
    const match = filename.match(/Site (\d+)/i);
    if (!match) {
      console.warn(`  ⚠️  Could not extract site number from filename: ${filename}`);
      continue;
    }

    const siteNumber = match[1];
    console.log(`  Site Number: ${siteNumber}`);

    // Find the site in database
    const siteResults = await db.select().from(sites).where(
      and(
        eq(sites.centreId, centre.id),
        eq(sites.siteNumber, siteNumber)
      )
    );

    if (siteResults.length === 0) {
      console.warn(`  ⚠️  Site ${siteNumber} not found in database`);
      continue;
    }

    const site = siteResults[0];

    // Read the image file
    const imagePath = `${imageDir}/${filename}`;
    const imageBuffer = readFileSync(imagePath);
    const fileExtension = filename.split('.').pop();

    // Upload to S3 with unique key
    const randomSuffix = nanoid(8);
    const s3Key = `sites/highlands-marketplace/site-${siteNumber}-${randomSuffix}.${fileExtension}`;
    
    console.log(`  Uploading to S3: ${s3Key}`);
    
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
    const { url } = await storagePut(s3Key, imageBuffer, mimeType);

    console.log(`  ✅ Uploaded: ${url}`);

    // Update database with image URL (use imageUrl1)
    await db.update(sites)
      .set({ imageUrl1: url })
      .where(eq(sites.id, site.id));

    console.log(`  ✅ Database updated for Site ${siteNumber}\n`);
  }

  console.log('✅ All images uploaded successfully!');
}

uploadSiteImages().catch(console.error);
