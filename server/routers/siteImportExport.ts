import { ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { sites, shoppingCentres } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const HEADERS = [
  "Site Number",
  "Size",
  "Description",
  "Max Tables",
  "Power Available Y/N/R",
  "Restrictions",
  "Mon-Fri Daily Rate ($)",
  "Weekend Daily Rate ($)",
  "Weekly Rate ($)",
  "Outgoings/Day ($)",
  "Enable instant booking Y/N",
  "URL",
] as const;

function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

const HEADER_MAP: Record<string, keyof typeof FIELD_MAP> = {};
HEADERS.forEach((h) => {
  HEADER_MAP[normalizeHeader(h)] = h as any;
});

const FIELD_MAP = {
  "Site Number": "siteNumber",
  "Size": "size",
  "Description": "description",
  "Max Tables": "maxTables",
  "Power Available Y/N/R": "powerAvailable",
  "Restrictions": "restrictions",
  "Mon-Fri Daily Rate ($)": "pricePerDay",
  "Weekend Daily Rate ($)": "weekendPricePerDay",
  "Weekly Rate ($)": "pricePerWeek",
  "Outgoings/Day ($)": "outgoingsPerDay",
  "Enable instant booking Y/N": "instantBooking",
  "URL": "_url",
} as const;

function parseBoolean(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === "y" || v === "yes" || v === "true" || v === "1";
}

function parseOptionalDecimal(val: string): string | null {
  const cleaned = val.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return num.toFixed(2);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function parseCSV(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
          i++;
        }
        row.push(current);
        current = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
      } else {
        current += ch;
      }
    }
  }
  row.push(current);
  if (row.some((c) => c.trim())) rows.push(row);

  return rows;
}

async function getCentreIdsForScope(
  scopeType: "centre" | "owner",
  scopeId: number
): Promise<number[]> {
  if (scopeType === "centre") return [scopeId];
  const centres = await db.getShoppingCentres(scopeId);
  return centres.map((c) => c.id);
}

// ============ Vacant Shops Import/Export ============

const VS_HEADERS = [
  "Shop Number",
  "Total Size (m²)",
  "Dimensions",
  "Powered Y/N",
  "Description",
  "Weekly Rate ($)",
  "Monthly Rate ($)",
  "Outgoings/Day ($)",
  "Active Y/N",
] as const;

export const vsImportExportRouter = router({
  exportVacantShops: ownerProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import("../tenantScope");
      const scopedOwnerId = getScopedOwnerId(ctx.user);

      const centre = await db.getShoppingCentreById(input.centreId);
      if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
      if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { getVacantShopsByCentre } = await import("../assetDb");
      const shops = await getVacantShopsByCentre(input.centreId);

      const csvRows: string[] = [];
      csvRows.push(VS_HEADERS.map(escapeCSV).join(","));

      for (const shop of shops) {
        const row = [
          shop.shopNumber || "",
          shop.totalSizeM2 || "",
          shop.dimensions || "",
          shop.powered ? "Y" : "N",
          stripHtml(shop.description || ""),
          shop.pricePerWeek || "",
          shop.pricePerMonth || "",
          (shop as any).outgoingsPerDay || "",
          shop.isActive ? "Y" : "N",
        ];
        csvRows.push(row.map(escapeCSV).join(","));
      }

      return { csv: csvRows.join("\n"), count: shops.length };
    }),

  importVacantShops: ownerProcedure
    .input(z.object({ centreId: z.number(), csvContent: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import("../tenantScope");
      const scopedOwnerId = getScopedOwnerId(ctx.user);

      const centre = await db.getShoppingCentreById(input.centreId);
      if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
      if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { createVacantShop, updateVacantShop, getVacantShopsByCentre } = await import("../assetDb");

      const rows = parseCSV(input.csvContent);
      if (rows.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CSV must have a header row and at least one data row" });
      }

      const headerRow = rows[0].map(normalizeHeader);
      const colMap: Record<string, number> = {};
      const vsHeaderMap: Record<string, string> = {};
      VS_HEADERS.forEach((h) => { vsHeaderMap[normalizeHeader(h)] = h; });
      headerRow.forEach((h, i) => {
        if (vsHeaderMap[h]) colMap[vsHeaderMap[h]] = i;
      });

      if (colMap["Shop Number"] === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: 'CSV must include a "Shop Number" column' });
      }

      const existingShops = await getVacantShopsByCentre(input.centreId);
      const existingMap = new Map(existingShops.map((s) => [s.shopNumber.trim().toLowerCase(), s]));

      const results = { created: 0, updated: 0, errors: [] as string[] };

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        try {
          const getValue = (header: string): string => {
            const idx = colMap[header];
            if (idx === undefined) return "";
            return (row[idx] || "").trim();
          };

          const shopNumber = getValue("Shop Number");
          if (!shopNumber) {
            results.errors.push(`Row ${rowNum}: Missing Shop Number — skipped`);
            continue;
          }

          const poweredRaw = getValue("Powered Y/N");
          const powered = poweredRaw ? parseBoolean(poweredRaw) : false;

          const activeRaw = getValue("Active Y/N");
          const isActive = activeRaw ? parseBoolean(activeRaw) : true;

          const shopData = {
            shopNumber,
            totalSizeM2: getValue("Total Size (m²)") || null,
            dimensions: getValue("Dimensions") || null,
            powered,
            description: getValue("Description") || null,
            pricePerWeek: parseOptionalDecimal(getValue("Weekly Rate ($)")),
            pricePerMonth: parseOptionalDecimal(getValue("Monthly Rate ($)")),
            outgoingsPerDay: parseOptionalDecimal(getValue("Outgoings/Day ($)")),
            isActive,
          };

          const existing = existingMap.get(shopNumber.toLowerCase());
          if (existing) {
            await updateVacantShop(existing.id, shopData);
            results.updated++;
          } else {
            await createVacantShop({ centreId: input.centreId, ...shopData });
            results.created++;
          }
        } catch (err: any) {
          results.errors.push(`Row ${rowNum}: ${err.message || "Unknown error"}`);
        }
      }

      import("../auditHelper")
        .then((m) =>
          m.writeAudit({
            userId: ctx.user.id,
            action: "vacant_shops_bulk_imported",
            entityType: "centre",
            entityId: input.centreId,
            changes: { created: results.created, updated: results.updated, errors: results.errors.length },
          })
        )
        .catch(() => {});

      return results;
    }),
});

// ============ Third Line Income Import/Export ============

const TLI_HEADERS = [
  "Asset Number",
  "Category",
  "Dimensions",
  "Powered Y/N",
  "Description",
  "Weekly Rate ($)",
  "Monthly Rate ($)",
  "Outgoings/Day ($)",
  "Active Y/N",
] as const;

export const tliImportExportRouter = router({
  exportThirdLineIncome: ownerProcedure
    .input(z.object({ centreId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import("../tenantScope");
      const scopedOwnerId = getScopedOwnerId(ctx.user);

      const centre = await db.getShoppingCentreById(input.centreId);
      if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
      if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { getThirdLineIncomeByCentre } = await import("../assetDb");
      const assets = await getThirdLineIncomeByCentre(input.centreId);

      const csvRows: string[] = [];
      csvRows.push(TLI_HEADERS.map(escapeCSV).join(","));

      for (const asset of assets) {
        const row = [
          asset.assetNumber || "",
          asset.categoryName || "",
          asset.dimensions || "",
          asset.powered ? "Y" : "N",
          stripHtml(asset.description || ""),
          asset.pricePerWeek || "",
          asset.pricePerMonth || "",
          asset.outgoingsPerDay || "",
          asset.isActive ? "Y" : "N",
        ];
        csvRows.push(row.map(escapeCSV).join(","));
      }

      return { csv: csvRows.join("\n"), count: assets.length };
    }),

  importThirdLineIncome: ownerProcedure
    .input(z.object({ centreId: z.number(), csvContent: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import("../tenantScope");
      const scopedOwnerId = getScopedOwnerId(ctx.user);

      const centre = await db.getShoppingCentreById(input.centreId);
      if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
      if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { createThirdLineIncome, updateThirdLineIncome, getThirdLineIncomeByCentre, getAllThirdLineCategories } =
        await import("../assetDb");

      const categories = await getAllThirdLineCategories();
      const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

      const rows = parseCSV(input.csvContent);
      if (rows.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CSV must have a header row and at least one data row" });
      }

      const headerRow = rows[0].map(normalizeHeader);
      const colMap: Record<string, number> = {};
      const tliHeaderMap: Record<string, string> = {};
      TLI_HEADERS.forEach((h) => { tliHeaderMap[normalizeHeader(h)] = h; });
      headerRow.forEach((h, i) => {
        if (tliHeaderMap[h]) colMap[tliHeaderMap[h]] = i;
      });

      if (colMap["Asset Number"] === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: 'CSV must include an "Asset Number" column' });
      }

      const existingAssets = await getThirdLineIncomeByCentre(input.centreId);
      const existingMap = new Map(existingAssets.map((a) => [a.assetNumber.trim().toLowerCase(), a]));

      const results = { created: 0, updated: 0, errors: [] as string[] };

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        try {
          const getValue = (header: string): string => {
            const idx = colMap[header];
            if (idx === undefined) return "";
            return (row[idx] || "").trim();
          };

          const assetNumber = getValue("Asset Number");
          if (!assetNumber) {
            results.errors.push(`Row ${rowNum}: Missing Asset Number — skipped`);
            continue;
          }

          const categoryName = getValue("Category");
          let categoryId: number | undefined;
          if (categoryName) {
            categoryId = categoryMap.get(categoryName.toLowerCase());
            if (!categoryId) {
              results.errors.push(`Row ${rowNum}: Unknown category "${categoryName}" — skipped`);
              continue;
            }
          }

          const poweredRaw = getValue("Powered Y/N");
          const powered = poweredRaw ? parseBoolean(poweredRaw) : false;

          const activeRaw = getValue("Active Y/N");
          const isActive = activeRaw ? parseBoolean(activeRaw) : true;

          const assetData = {
            assetNumber,
            dimensions: getValue("Dimensions") || null,
            powered,
            description: getValue("Description") || null,
            pricePerWeek: parseOptionalDecimal(getValue("Weekly Rate ($)")),
            pricePerMonth: parseOptionalDecimal(getValue("Monthly Rate ($)")),
            outgoingsPerDay: parseOptionalDecimal(getValue("Outgoings/Day ($)")),
            isActive,
          };

          const existing = existingMap.get(assetNumber.toLowerCase());
          if (existing) {
            await updateThirdLineIncome(existing.id, { ...assetData, ...(categoryId ? { categoryId } : {}) });
            results.updated++;
          } else {
            if (!categoryId) {
              results.errors.push(`Row ${rowNum}: Category is required for new assets — skipped`);
              continue;
            }
            await createThirdLineIncome({ centreId: input.centreId, categoryId, ...assetData });
            results.created++;
          }
        } catch (err: any) {
          results.errors.push(`Row ${rowNum}: ${err.message || "Unknown error"}`);
        }
      }

      import("../auditHelper")
        .then((m) =>
          m.writeAudit({
            userId: ctx.user.id,
            action: "third_line_income_bulk_imported",
            entityType: "centre",
            entityId: input.centreId,
            changes: { created: results.created, updated: results.updated, errors: results.errors.length },
          })
        )
        .catch(() => {});

      return results;
    }),
});

// ============ CL Site Import/Export ============

export const siteImportExportRouter = router({
  importSites: ownerProcedure
    .input(
      z.object({
        scopeType: z.enum(["centre", "owner"]),
        scopeId: z.number(),
        csvContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import("../tenantScope");
      const scopedOwnerId = getScopedOwnerId(ctx.user);

      // Determine target centre(s)
      let targetCentreIds: number[];
      if (input.scopeType === "centre") {
        const centre = await db.getShoppingCentreById(input.scopeId);
        if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        targetCentreIds = [centre.id];
      } else {
        if (scopedOwnerId && scopedOwnerId !== input.scopeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const centres = await db.getShoppingCentres(input.scopeId);
        targetCentreIds = centres.map((c) => c.id);
        if (targetCentreIds.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No centres found for this owner" });
        }
      }

      // For single-centre import, we know the target
      // For owner import, all rows go to the first centre (owner must pick a centre)
      // Actually per spec: for owner scope we filter to centres under that owner,
      // but sites are created per-centre, so we need a single centreId.
      // The UI will enforce centre selection, so scopeType=centre is the primary path for import.
      if (input.scopeType === "owner" && targetCentreIds.length > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please select a specific centre for import, not an owner with multiple centres",
        });
      }
      const centreId = targetCentreIds[0];

      // Parse CSV
      const rows = parseCSV(input.csvContent);
      if (rows.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CSV must have a header row and at least one data row" });
      }

      const headerRow = rows[0].map(normalizeHeader);

      // Map headers to canonical names
      const colMap: Record<string, number> = {};
      headerRow.forEach((h, i) => {
        if (HEADER_MAP[h]) {
          colMap[HEADER_MAP[h]] = i;
        }
      });

      if (colMap["Site Number"] === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: 'CSV must include a "Site Number" column' });
      }

      // Get existing sites for this centre for upsert
      const existingSites = await db.getSitesByCentreId(centreId);
      const existingMap = new Map(existingSites.map((s) => [s.siteNumber.trim().toLowerCase(), s]));

      const results = { created: 0, updated: 0, errors: [] as string[] };

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        try {
          const getValue = (header: string): string => {
            const idx = colMap[header];
            if (idx === undefined) return "";
            return (row[idx] || "").trim();
          };

          const siteNumber = getValue("Site Number");
          if (!siteNumber) {
            results.errors.push(`Row ${rowNum}: Missing Site Number — skipped`);
            continue;
          }

          const maxTablesRaw = getValue("Max Tables");
          const maxTables = maxTablesRaw ? parseInt(maxTablesRaw) : null;
          if (maxTablesRaw && (isNaN(maxTables!) || maxTables! < 0)) {
            results.errors.push(`Row ${rowNum}: Invalid Max Tables "${maxTablesRaw}" — skipped`);
            continue;
          }

          const pricePerDay = parseOptionalDecimal(getValue("Mon-Fri Daily Rate ($)"));
          const weekendPricePerDay = parseOptionalDecimal(getValue("Weekend Daily Rate ($)"));
          const pricePerWeek = parseOptionalDecimal(getValue("Weekly Rate ($)"));
          const outgoingsPerDay = parseOptionalDecimal(getValue("Outgoings/Day ($)"));

          const instantBookingRaw = getValue("Enable instant booking Y/N");
          const instantBooking = instantBookingRaw ? parseBoolean(instantBookingRaw) : true;

          const siteData = {
            siteNumber,
            size: getValue("Size") || null,
            description: getValue("Description") || null,
            maxTables,
            powerAvailable: getValue("Power Available Y/N/R") || null,
            restrictions: getValue("Restrictions") || null,
            pricePerDay,
            weekendPricePerDay,
            pricePerWeek,
            outgoingsPerDay,
            instantBooking,
          };

          const existing = existingMap.get(siteNumber.toLowerCase());
          if (existing) {
            await db.updateSite(existing.id, siteData);
            results.updated++;
          } else {
            await db.createSite({ centreId, ...siteData });
            results.created++;
          }
        } catch (err: any) {
          results.errors.push(`Row ${rowNum}: ${err.message || "Unknown error"}`);
        }
      }

      // Audit
      import("../auditHelper")
        .then((m) =>
          m.writeAudit({
            userId: ctx.user.id,
            action: "sites_bulk_imported",
            entityType: "centre",
            entityId: centreId,
            changes: { created: results.created, updated: results.updated, errors: results.errors.length },
          })
        )
        .catch(() => {});

      return results;
    }),

  exportSites: ownerProcedure
    .input(
      z.object({
        scopeType: z.enum(["centre", "owner"]),
        scopeId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { getScopedOwnerId } = await import("../tenantScope");
      const scopedOwnerId = getScopedOwnerId(ctx.user);

      let centreIds: number[];
      if (input.scopeType === "centre") {
        const centre = await db.getShoppingCentreById(input.scopeId);
        if (!centre) throw new TRPCError({ code: "NOT_FOUND", message: "Centre not found" });
        if (scopedOwnerId && centre.ownerId !== scopedOwnerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        centreIds = [centre.id];
      } else {
        if (scopedOwnerId && scopedOwnerId !== input.scopeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const centres = await db.getShoppingCentres(input.scopeId);
        centreIds = centres.map((c) => c.id);
      }

      // Fetch all sites and centres for URL generation
      const allSites: Array<any & { _centreName?: string; _centreSlug?: string | null }> = [];
      for (const cId of centreIds) {
        const centreSites = await db.getSitesByCentreId(cId);
        const centre = await db.getShoppingCentreById(cId);
        for (const s of centreSites) {
          allSites.push({
            ...s,
            _centreName: centre?.name || "",
            _centreSlug: centre?.slug || null,
          });
        }
      }

      // Build CSV
      const csvRows: string[] = [];
      csvRows.push(HEADERS.map(escapeCSV).join(","));

      for (const site of allSites) {
        const slug =
          site._centreSlug ||
          (site._centreName as string)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        const url = `/centre/${slug}`;

        const row = [
          site.siteNumber || "",
          site.size || "",
          stripHtml(site.description || ""),
          site.maxTables != null ? String(site.maxTables) : "",
          site.powerAvailable || "",
          site.restrictions || "",
          site.pricePerDay || "",
          site.weekendPricePerDay || "",
          site.pricePerWeek || "",
          site.outgoingsPerDay || "",
          site.instantBooking ? "Y" : "N",
          url,
        ];
        csvRows.push(row.map(escapeCSV).join(","));
      }

      return { csv: csvRows.join("\n"), count: allSites.length };
    }),
});
