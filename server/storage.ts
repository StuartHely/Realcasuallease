// Direct AWS S3 storage
// Falls back to local filesystem storage when S3 bucket is not configured (dev mode)

import { ENV } from './_core/env';
import path from 'path';
import fs from 'fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function isLocalMode(): boolean {
  return !ENV.awsS3Bucket;
}

// Log storage mode on first import
console.log(`[Storage] mode=${isLocalMode() ? 'LOCAL' : 'S3'} bucket="${ENV.awsS3Bucket || '(empty)'}" region="${ENV.awsRegion}"`);

function getS3Client(): S3Client {
  return new S3Client({
    region: ENV.awsRegion,
    ...(ENV.awsAccessKeyId
      ? {
          credentials: {
            accessKeyId: ENV.awsAccessKeyId,
            secretAccessKey: ENV.awsSecretAccessKey,
          },
        }
      : {}),
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function buildS3Url(key: string): string {
  return `https://${ENV.awsS3Bucket}.s3.${ENV.awsRegion}.amazonaws.com/${key}`;
}

async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const { getPublicDir } = await import('./_core/publicDir');
  const uploadsDir = path.resolve(getPublicDir(), 'uploads');
  const filePath = path.join(uploadsDir, ...key.split('/'));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  await fs.writeFile(filePath, buffer);
  const url = `/uploads/${key}`;
  return { key, url };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (isLocalMode()) {
    return localStoragePut(relKey, data);
  }

  const key = normalizeKey(relKey);
  const s3 = getS3Client();
  const body = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);

  await s3.send(
    new PutObjectCommand({
      Bucket: ENV.awsS3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: buildS3Url(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (isLocalMode()) {
    return { key, url: `/uploads/${key}` };
  }
  return { key, url: buildS3Url(key) };
}
