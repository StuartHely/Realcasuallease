/**
 * Sync local images to S3 and update database URLs.
 *
 * This script:
 *  1. Scans all image URL columns in the database for local paths (/uploads/... or /maps/...)
 *  2. Uploads the corresponding local files to S3
 *  3. Updates the database URLs to point to the S3 versions
 *
 * Usage:
 *   node scripts/sync-images-to-s3.mjs              # Dry run (preview changes)
 *   node scripts/sync-images-to-s3.mjs --apply      # Actually upload and update DB
 *
 * Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DATABASE_URL env vars
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import pg from "pg";
import fs from "fs";
import path from "path";

const BUCKET = "casuallease-public";
const REGION = "ap-southeast-2";
const LOCAL_PUBLIC_DIR = "client/public";
const DRY_RUN = !process.argv.includes("--apply");

// All tables and columns that store image/file URLs
const IMAGE_COLUMNS = [
  // sites table
  { table: "sites", idCol: "id", columns: ["imageUrl1", "imageUrl2", "imageUrl3", "imageUrl4", "panoramaImageUrl"] },
  // shopping_centres table
  { table: "shopping_centres", idCol: "id", columns: ["mapImageUrl", "pdfUrl1", "pdfUrl2", "pdfUrl3"] },
  // floor_levels table
  { table: "floor_levels", idCol: "id", columns: ["mapImageUrl"] },
  // vacant_shops table
  { table: "vacant_shops", idCol: "id", columns: ["imageUrl1", "imageUrl2"] },
  // third_line_income table
  { table: "third_line_income", idCol: "id", columns: ["imageUrl1", "imageUrl2"] },
  // owners table
  { table: "owners", idCol: "id", columns: ["brandLogoUrl", "brandFaviconUrl"] },
];

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  };
  return types[ext] || "application/octet-stream";
}

function isLocalPath(url) {
  if (!url) return false;
  // Local paths start with / but are not full S3 URLs
  return (url.startsWith("/uploads/") || url.startsWith("/maps/"));
}

function localPathToS3Key(localUrl) {
  // /uploads/sites/1/file.webp -> uploads/sites/1/file.webp
  // /maps/floor-levels/23-123.png -> maps/floor-levels/23-123.png
  return localUrl.replace(/^\//, "");
}

function buildS3Url(s3Key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;
}

async function s3ObjectExists(s3, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!DRY_RUN && (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)) {
    console.error("❌ Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("❌ Set DATABASE_URL env var");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("🔍 DRY RUN — no changes will be made. Use --apply to execute.\n");
  } else {
    console.log("🚀 APPLYING changes — uploading to S3 and updating database.\n");
  }

  const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let totalLocal = 0;
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalMissing = 0;
  let totalUpdated = 0;

  for (const { table, idCol, columns } of IMAGE_COLUMNS) {
    const colList = [idCol, ...columns].map(c => `"${c}"`).join(", ");
    const { rows } = await client.query(`SELECT ${colList} FROM "${table}"`);

    for (const row of rows) {
      for (const col of columns) {
        const url = row[col];
        if (!isLocalPath(url)) continue;

        totalLocal++;
        const s3Key = localPathToS3Key(url);
        const localFilePath = path.join(LOCAL_PUBLIC_DIR, s3Key);
        const s3Url = buildS3Url(s3Key);

        if (!fs.existsSync(localFilePath)) {
          console.log(`  ⚠️  MISSING: ${table}.${col} (id=${row[idCol]}): ${localFilePath}`);
          totalMissing++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`  📋 ${table}.${col} (id=${row[idCol]}): ${url} → ${s3Url}`);
        } else {
          // Upload to S3 (skip if already exists)
          const exists = await s3ObjectExists(s3, s3Key);
          if (exists) {
            console.log(`  ⏭️  Already in S3: ${s3Key}`);
            totalSkipped++;
          } else {
            const body = fs.readFileSync(localFilePath);
            await s3.send(new PutObjectCommand({
              Bucket: BUCKET,
              Key: s3Key,
              Body: body,
              ContentType: getContentType(localFilePath),
            }));
            console.log(`  ✅ Uploaded: ${s3Key} (${(fs.statSync(localFilePath).size / 1024).toFixed(1)} KB)`);
            totalUploaded++;
          }

          // Update DB
          await client.query(
            `UPDATE "${table}" SET "${col}" = $1 WHERE "${idCol}" = $2`,
            [s3Url, row[idCol]]
          );
          totalUpdated++;
          console.log(`  🔄 Updated: ${table}.${col} (id=${row[idCol]})`);
        }
      }
    }
  }

  await client.end();

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Local paths found:  ${totalLocal}`);
  if (DRY_RUN) {
    console.log(`   Would upload:       ${totalLocal - totalMissing}`);
    console.log(`   Missing locally:    ${totalMissing}`);
    console.log(`\n   Run with --apply to execute.`);
  } else {
    console.log(`   Uploaded to S3:     ${totalUploaded}`);
    console.log(`   Already in S3:      ${totalSkipped}`);
    console.log(`   DB rows updated:    ${totalUpdated}`);
    console.log(`   Missing locally:    ${totalMissing}`);
  }
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
