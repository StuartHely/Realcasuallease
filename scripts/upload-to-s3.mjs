/**
 * Upload local DB dump and images to S3 for production migration.
 * Usage: node scripts/upload-to-s3.mjs
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const BUCKET = "casuallease-public";
const REGION = "ap-southeast-2";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(localPath, s3Key, contentType) {
  const body = fs.readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: contentType,
    })
  );
  console.log(`  ✓ ${s3Key} (${(body.length / 1024).toFixed(1)} KB)`);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".backup": "application/octet-stream",
  };
  return types[ext] || "application/octet-stream";
}

function walkDir(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
    process.exit(1);
  }

  console.log("=== Uploading DB dump ===");
  await uploadFile("casuallease_dump.backup", "migration/casuallease_dump.backup", "application/octet-stream");

  console.log("\n=== Uploading site images ===");
  const uploadFiles = walkDir("client/public/uploads");
  for (const f of uploadFiles) {
    // S3 key mirrors the local path structure: uploads/sites/1/file.webp
    const s3Key = f.replace(/\\/g, "/").replace("client/public/", "");
    await uploadFile(f, s3Key, getContentType(f));
  }

  console.log("\n=== Uploading map images ===");
  const mapFiles = walkDir("client/public/maps");
  for (const f of mapFiles) {
    const s3Key = f.replace(/\\/g, "/").replace("client/public/", "");
    await uploadFile(f, s3Key, getContentType(f));
  }

  console.log(`\n✅ Done. ${1 + uploadFiles.length + mapFiles.length} files uploaded to s3://${BUCKET}/`);
  
  console.log("\n=== S3 URLs for DB update ===");
  console.log(`Images base URL: https://${BUCKET}.s3.${REGION}.amazonaws.com/`);
  console.log(`DB dump: s3://${BUCKET}/migration/casuallease_dump.backup`);
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
