/**
 * Geocoding utility — resolves a shopping centre's address to lat/lng
 * using the OpenStreetMap Nominatim API (no API key required).
 */

import * as db from "./db";

async function nominatimSearch(query: string): Promise<{ lat: string; lon: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "au");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "CasualLease/1.0" },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  return data.length > 0 ? data[0] : null;
}

/**
 * Geocode a centre by its address fields and store the result.
 * Tries multiple query strategies in order of specificity.
 * Fire-and-forget safe — logs errors but never throws.
 */
export async function geocodeCentre(centreId: number, fields: {
  name?: string | null;
  address?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
}): Promise<void> {
  const queries = [
    [fields.name, fields.address, fields.suburb, fields.state, fields.postcode].filter(Boolean).join(", "),
    [fields.name, fields.suburb, fields.state].filter(Boolean).join(", "),
    [fields.address, fields.suburb, fields.state].filter(Boolean).join(", "),
    [fields.suburb, fields.state, "Australia"].filter(Boolean).join(", "),
  ];

  for (const query of queries) {
    if (!query.trim()) continue;
    try {
      const result = await nominatimSearch(query);
      if (result) {
        await db.updateShoppingCentre(centreId, {
          latitude: result.lat,
          longitude: result.lon,
        });
        console.log(`[Geocode] Centre ${centreId}: ${result.lat}, ${result.lon}`);
        return;
      }
    } catch (err: any) {
      console.error(`[Geocode] Centre ${centreId} query "${query}" failed:`, err.message);
    }
  }
  console.warn(`[Geocode] Centre ${centreId}: no results for any query variation`);
}
