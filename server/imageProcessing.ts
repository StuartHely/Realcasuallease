import sharp from 'sharp';
import { storagePut } from './storage';

/**
 * Process and upload an image for a site
 * - Resizes to max 1200x800 while maintaining aspect ratio
 * - Converts to WebP for optimal file size
 * - Uploads to S3 storage
 * 
 * @param base64Image - Base64 encoded image data (with or without data URI prefix)
 * @param siteId - ID of the site this image belongs to
 * @param slot - Image slot number (1-4)
 * @returns Object containing the uploaded image URL
 */
export async function processAssetImage(
  base64Image: string,
  assetType: 'vacant-shop' | 'third-line',
  assetId: number,
  slot: number
): Promise<{ url: string }> {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const processedImage = await sharp(imageBuffer)
    .resize(1200, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const fileName = `${assetType}-${assetId}-slot${slot}-${timestamp}-${random}.webp`;
  const fileKey = `${assetType}s/${assetId}/${fileName}`;

  const { url } = await storagePut(
    fileKey,
    processedImage,
    'image/webp'
  );

  return { url };
}

export async function processSiteImage(
  base64Image: string,
  siteId: number,
  slot: number
): Promise<{ url: string }> {
  // Remove data URI prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Process image with sharp - resize to fit within 1200x800 while maintaining aspect ratio
  const processedImage = await sharp(imageBuffer)
    .resize(1200, 800, {
      fit: 'inside', // Resize to fit within bounds, preserving aspect ratio
      withoutEnlargement: true, // Don't upscale small images
    })
    .webp({ quality: 85 })
    .toBuffer();

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const fileName = `site-${siteId}-slot${slot}-${timestamp}-${random}.webp`;
  const fileKey = `sites/${siteId}/${fileName}`;

  // Upload to S3
  const { url } = await storagePut(
    fileKey,
    processedImage,
    'image/webp'
  );

  return { url };
}
