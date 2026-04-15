import { Router, Request, Response } from "express";

const router = Router();

/**
 * Image proxy endpoint that fetches images when direct URLs fail.
 * Provides a server-side fetch fallback for CORS or permission issues.
 * 
 * Usage: /api/image-proxy?url=<encoded-image-url>
 */
router.get("/image-proxy", async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    // Only allow proxying from known domains
    if (!url.includes("cloudfront.net") && !url.includes(".s3.") && !url.includes("amazonaws.com")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Image fetch failed" });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("[ImageProxy] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export function registerImageProxyRoutes(app: ReturnType<typeof import("express")>) {
  app.use("/api", router);
}
