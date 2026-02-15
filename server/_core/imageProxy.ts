import { Router, Request, Response } from "express";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "./env";

const router = Router();

// Initialize S3 client
const s3Client = new S3Client({
  region: ENV.awsRegion || "ap-southeast-2",
  credentials: ENV.awsAccessKeyId && ENV.awsSecretAccessKey ? {
    accessKeyId: ENV.awsAccessKeyId,
    secretAccessKey: ENV.awsSecretAccessKey,
  } : undefined,
});

/**
 * Image proxy endpoint that fetches images from storage when direct CloudFront URLs fail.
 * This provides a graceful fallback for when S3/CloudFront permissions are misconfigured.
 * 
 * Usage: /api/image-proxy?url=<encoded-cloudfront-url>
 */
router.get("/image-proxy", async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    // Validate that the URL is from our CloudFront distribution or S3
    if (!url.includes("cloudfront.net") && !url.includes("s3.amazonaws.com") && !url.includes("s3.ap-southeast-2.amazonaws.com")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    // Extract the path from the URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 1) {
      return res.status(400).json({ error: "Invalid path format" });
    }

    // First, try direct fetch (in case it's publicly accessible)
    try {
      const directResponse = await fetch(url, { method: "GET" });
      if (directResponse.ok) {
        const contentType = directResponse.headers.get("content-type") || "image/png";
        const buffer = await directResponse.arrayBuffer();
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
        return res.send(Buffer.from(buffer));
      }
    } catch {
      // Direct fetch failed, continue to S3 fetch
    }

    // Try to fetch from S3 directly
    const bucket = ENV.awsS3Bucket;
    if (!bucket) {
      return res.status(500).json({ error: "Storage not configured" });
    }

    // Try different path formats
    const pathFormats = [
      pathParts.join("/"), // Full path
      pathParts.slice(1).join("/"), // Skip first segment
      pathParts.slice(2).join("/"), // Skip first two segments
    ];

    for (const key of pathFormats) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        
        const response = await s3Client.send(command);
        
        if (response.Body) {
          const contentType = response.ContentType || "image/png";
          const buffer = await response.Body.transformToByteArray();
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(Buffer.from(buffer));
        }
      } catch {
        // Try next format
      }
    }

    // If all attempts fail, return error
    return res.status(404).json({ error: "Image not found" });
    
  } catch (error) {
    console.error("[ImageProxy] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export function registerImageProxyRoutes(app: ReturnType<typeof import("express")>) {
  app.use("/api", router);
}
