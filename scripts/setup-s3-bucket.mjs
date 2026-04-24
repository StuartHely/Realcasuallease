/**
 * Create S3 bucket (if needed), set public read policy, upload all local images,
 * and update local database URLs.
 *
 * Usage: node scripts/setup-s3-bucket.mjs
 *
 * Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, DATABASE_URL
 */

import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import pg from "pg";
import fs from "fs";
import path from "path";

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || "ap-southeast-2";
const LOCAL_PUBLIC_DIR = "client/public";
const DB_URL = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/casuallease";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("❌ Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
  process.exit(1);
}
if (!BUCKET) {
  console.error("❌ Set AWS_S3_BUCKET");
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".webp": "image/webp", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  }[ext] || "application/octet-stream";
}

function walkDir(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function buildS3Url(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function main() {
  // 1. Create bucket if it doesn't exist
  console.log(`\n🪣 Checking bucket: ${BUCKET}...`);
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`   ✅ Bucket exists`);
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      console.log(`   Creating bucket...`);
      await s3.send(new CreateBucketCommand({
        Bucket: BUCKET,
        CreateBucketConfiguration: { LocationConstraint: REGION },
      }));
      console.log(`   ✅ Bucket created`);
    } else {
      console.error(`   ❌ Error checking bucket:`, err.message);
      process.exit(1);
    }
  }

  // 2. Disable block public access
  console.log(`\n🔓 Setting public access...`);
  try {
    await s3.send(new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }));
    console.log(`   ✅ Public access block disabled`);
  } catch (err) {
    console.error(`   ⚠️ Could not set public access block:`, err.message);
  }

  // 3. Set bucket policy for public reads
  console.log(`\n📋 Setting bucket policy...`);
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Sid: "PublicReadGetObject",
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: `arn:aws:s3:::${BUCKET}/*`,
    }],
  });
  try {
    await s3.send(new PutBucketPolicyCommand({ Bucket: BUCKET, Policy: policy }));
    console.log(`   ✅ Public read policy set`);
  } catch (err) {
    console.error(`   ⚠️ Could not set bucket policy:`, err.message);
  }

  // 4. Upload all images and maps
  console.log(`\n📤 Uploading files to S3...`);
  const dirs = ["uploads", "images", "maps", "logos", "heroes", "panoramas"];
  let totalUploaded = 0;
  const pathRemap = new Map(); // local path -> S3 URL

  for (const dir of dirs) {
    const localDir = path.join(LOCAL_PUBLIC_DIR, dir);
    const files = walkDir(localDir);
    if (files.length === 0) continue;

    console.log(`\n   📁 ${dir}/ (${files.length} files)`);
    for (const f of files) {
      const s3Key = f.replace(/\\/g, "/").replace("client/public/", "");
      const localPath = "/" + s3Key; // e.g., /uploads/sites/1/photo.webp
      const body = fs.readFileSync(f);
      try {
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          Body: body,
          ContentType: getContentType(f),
        }));
        const s3Url = buildS3Url(s3Key);
        pathRemap.set(localPath, s3Url);
        totalUploaded++;
        process.stdout.write(`      ✅ ${s3Key} (${(body.length / 1024).toFixed(1)} KB)\n`);
      } catch (err) {
        console.error(`      ❌ ${s3Key}: ${err.message}`);
      }
    }
  }
  console.log(`\n   📊 Total uploaded: ${totalUploaded} files`);

  // 5. Update local database URLs
  console.log(`\n🔄 Updating database URLs...`);
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  const imageColumns = [
    { table: "shopping_centres", cols: ["mapImageUrl", "pdfUrl1", "pdfUrl2", "pdfUrl3"] },
    { table: "floor_levels", cols: ["mapImageUrl"] },
    { table: "sites", cols: ["imageUrl1", "imageUrl2", "imageUrl3", "imageUrl4", "panoramaImageUrl"] },
    { table: "vacant_shops", cols: ["imageUrl1", "imageUrl2"] },
    { table: "third_line_income", cols: ["imageUrl1", "imageUrl2"] },
    { table: "owners", cols: ["brandLogoUrl", "brandFaviconUrl"] },
  ];

  let totalUpdated = 0;
  for (const { table, cols } of imageColumns) {
    for (const col of cols) {
      // Find rows with local paths
      const { rows } = await client.query(
        `SELECT id, "${col}" FROM "${table}" WHERE "${col}" IS NOT NULL AND "${col}" LIKE '/%'`
      );
      for (const row of rows) {
        const s3Url = pathRemap.get(row[col]);
        if (s3Url) {
          await client.query(`UPDATE "${table}" SET "${col}" = $1 WHERE id = $2`, [s3Url, row.id]);
          totalUpdated++;
        }
      }
    }
  }

  await client.end();
  console.log(`   ✅ Updated ${totalUpdated} database records`);

  // 6. Verify a sample URL
  console.log(`\n🧪 Verifying...`);
  const sampleUrl = pathRemap.values().next().value;
  if (sampleUrl) {
    try {
      const resp = await fetch(sampleUrl, { method: "HEAD" });
      console.log(`   ${sampleUrl}`);
      console.log(`   Status: ${resp.status} ${resp.ok ? "✅" : "❌"}`);
    } catch (err) {
      console.log(`   ⚠️ Could not verify: ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Bucket: ${BUCKET}, Region: ${REGION}`);
  console.log(`   Base URL: https://${BUCKET}.s3.${REGION}.amazonaws.com/`);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
