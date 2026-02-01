import { Router, Request, Response } from "express";
import { ENV } from "./env";

const router = Router();

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

    // Validate that the URL is from our CloudFront distribution
    if (!url.includes("cloudfront.net")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    // Extract the path from the CloudFront URL
    // URL format: https://d2xsxph8kpxj0f.cloudfront.net/{userId}/{appId}/{path}
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 3) {
      return res.status(400).json({ error: "Invalid path format" });
    }

    // The path after userId/appId
    const filePath = pathParts.slice(2).join("/");
    
    // Try to fetch through the Forge API download endpoint
    const forgeUrl = ENV.forgeApiUrl;
    const forgeKey = ENV.forgeApiKey;
    
    if (!forgeUrl || !forgeKey) {
      return res.status(500).json({ error: "Storage not configured" });
    }

    // First, try direct fetch from CloudFront (in case it's working now)
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
      // Direct fetch failed, continue to proxy
    }

    // Try the storage download endpoint with different path formats
    const pathFormats = [
      filePath, // Just the file path
      pathParts.slice(1).join("/"), // appId/path
      pathParts.join("/"), // Full path
    ];

    for (const tryPath of pathFormats) {
      try {
        const downloadUrl = new URL("v1/storage/download", forgeUrl.replace(/\/+$/, "") + "/");
        downloadUrl.searchParams.set("path", tryPath);
        
        const response = await fetch(downloadUrl.toString(), {
          headers: { Authorization: `Bearer ${forgeKey}` },
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "image/png";
          const buffer = await response.arrayBuffer();
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(Buffer.from(buffer));
        }
      } catch {
        // Try next format
      }
    }

    // If all attempts fail, return a placeholder or error
    return res.status(404).json({ error: "Image not found" });
    
  } catch (error) {
    console.error("[ImageProxy] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export function registerImageProxyRoutes(app: ReturnType<typeof import("express")>) {
  app.use("/api", router);
}
