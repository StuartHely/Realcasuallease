import { Router, Request, Response } from "express";

const router = Router();

/**
 * Generate a professional placeholder SVG image for sites/assets.
 * 
 * Usage: /api/placeholder?type=site&number=1&size=3m x 3m&powered=true
 */
router.get("/placeholder", (req: Request, res: Response) => {
  const { type = "site", number = "", size = "", powered = "", label = "" } = req.query;
  
  const width = 256;
  const height = 256;
  
  // Color schemes based on type
  const colors: Record<string, { bg: string; accent: string; text: string }> = {
    site: { bg: "#1e3a5f", accent: "#3b82f6", text: "#ffffff" },
    shop: { bg: "#166534", accent: "#22c55e", text: "#ffffff" },
    asset: { bg: "#581c87", accent: "#a855f7", text: "#ffffff" },
    map: { bg: "#374151", accent: "#6b7280", text: "#ffffff" },
  };
  
  const scheme = colors[type as string] || colors.site;
  
  // Build display text
  const typeLabel = type === "site" ? "Site" : type === "shop" ? "Shop" : type === "asset" ? "Asset" : "Map";
  const displayNumber = number || "—";
  const displaySize = size ? String(size).replace(/\s*x\s*/g, " × ") : "";
  const displayPower = powered === "true" ? "⚡ Powered" : powered === "false" ? "No Power" : "";
  const displayLabel = label || "";
  
  // Generate SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${scheme.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${scheme.accent};stop-opacity:0.8" />
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${scheme.accent}" stroke-width="0.5" opacity="0.2"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  
  <!-- Icon circle -->
  <circle cx="${width/2}" cy="80" r="35" fill="${scheme.accent}" opacity="0.3"/>
  <circle cx="${width/2}" cy="80" r="28" fill="none" stroke="${scheme.text}" stroke-width="2" opacity="0.8"/>
  
  <!-- Type icon (simplified) -->
  ${type === "map" ? `
    <path d="M${width/2 - 12} 68 L${width/2} 58 L${width/2 + 12} 68 L${width/2 + 12} 92 L${width/2} 82 L${width/2 - 12} 92 Z" 
          fill="none" stroke="${scheme.text}" stroke-width="2" stroke-linejoin="round"/>
  ` : `
    <rect x="${width/2 - 15}" y="65" width="30" height="25" rx="3" fill="none" stroke="${scheme.text}" stroke-width="2"/>
    <line x1="${width/2 - 8}" y1="72" x2="${width/2 + 8}" y2="72" stroke="${scheme.text}" stroke-width="2"/>
    <line x1="${width/2 - 8}" y1="80" x2="${width/2 + 4}" y2="80" stroke="${scheme.text}" stroke-width="2"/>
  `}
  
  <!-- Type label -->
  <text x="${width/2}" y="135" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
        font-size="14" font-weight="500" fill="${scheme.text}" opacity="0.7">${typeLabel}</text>
  
  <!-- Number -->
  <text x="${width/2}" y="165" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
        font-size="32" font-weight="700" fill="${scheme.text}">${displayNumber}</text>
  
  <!-- Size -->
  ${displaySize ? `
    <text x="${width/2}" y="195" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
          font-size="12" fill="${scheme.text}" opacity="0.8">${displaySize}</text>
  ` : ""}
  
  <!-- Power status or label -->
  ${displayPower ? `
    <text x="${width/2}" y="220" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
          font-size="11" fill="${scheme.text}" opacity="0.7">${displayPower}</text>
  ` : displayLabel ? `
    <text x="${width/2}" y="220" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
          font-size="11" fill="${scheme.text}" opacity="0.7">${displayLabel}</text>
  ` : ""}
  
  <!-- Bottom accent line -->
  <rect x="40" y="${height - 20}" width="${width - 80}" height="3" rx="1.5" fill="${scheme.accent}" opacity="0.5"/>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});

/**
 * Generate a placeholder for floor plan maps.
 * 
 * Usage: /api/placeholder-map?level=Lower Level&centre=Campbelltown Mall
 */
router.get("/placeholder-map", (req: Request, res: Response) => {
  const { level = "Floor Plan", centre = "" } = req.query;
  
  const width = 800;
  const height = 600;
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
    <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" stroke-width="1"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#mapBg)"/>
  <rect width="${width}" height="${height}" fill="url(#mapGrid)"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#94a3b8" stroke-width="2" rx="8"/>
  
  <!-- Centre icon -->
  <circle cx="${width/2}" cy="${height/2 - 40}" r="60" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
  <path d="M${width/2 - 25} ${height/2 - 55} L${width/2} ${height/2 - 75} L${width/2 + 25} ${height/2 - 55} L${width/2 + 25} ${height/2 - 15} L${width/2} ${height/2 - 35} L${width/2 - 25} ${height/2 - 15} Z" 
        fill="none" stroke="#64748b" stroke-width="3" stroke-linejoin="round"/>
  
  <!-- Text -->
  <text x="${width/2}" y="${height/2 + 50}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
        font-size="24" font-weight="600" fill="#475569">Floor Plan Coming Soon</text>
  
  ${level ? `
    <text x="${width/2}" y="${height/2 + 85}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
          font-size="16" fill="#64748b">${level}</text>
  ` : ""}
  
  ${centre ? `
    <text x="${width/2}" y="${height/2 + 115}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
          font-size="14" fill="#94a3b8">${centre}</text>
  ` : ""}
  
  <!-- Corner decorations -->
  <path d="M40 60 L40 40 L60 40" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <path d="M${width - 40} 60 L${width - 40} 40 L${width - 60} 40" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <path d="M40 ${height - 60} L40 ${height - 40} L60 ${height - 40}" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <path d="M${width - 40} ${height - 60} L${width - 40} ${height - 40} L${width - 60} ${height - 40}" fill="none" stroke="#94a3b8" stroke-width="2"/>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});

export function registerPlaceholderRoutes(app: ReturnType<typeof import("express")>) {
  app.use("/api", router);
}
