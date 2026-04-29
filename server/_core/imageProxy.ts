import { Router, Request, Response } from "express";

const router = Router();

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Trusted hostnames for image proxying */
const ALLOWED_HOSTS = new Set([
  "cloudfront.net",
  "s3.amazonaws.com",
  "s3.ap-southeast-2.amazonaws.com",
]);

function isAllowedUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  // Only allow HTTPS
  if (parsed.protocol !== "https:") return false;

  // Reject private/internal IPs
  const host = parsed.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }

  // Check against allowed hostname suffixes
  return Array.from(ALLOWED_HOSTS).some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
}

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

    if (!isAllowedUrl(url)) {
      return res.status(400).json({ error: "URL not allowed" });
    }

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Image fetch failed" });
    }

    // Validate content type — only proxy images
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Response is not an image" });
    }

    // Enforce max size
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      return res.status(413).json({ error: "Image too large" });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      return res.status(413).json({ error: "Image too large" });
    }

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
