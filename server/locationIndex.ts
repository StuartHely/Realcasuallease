import { calculateDistance } from "./geoUtils";
import { shoppingCentres } from "../drizzle/schema";

export type LocationEntry = {
  centreId: number;
  centreName: string;
  slug: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
};

type AreaAlias = {
  suburbs?: string[];
  cities?: string[];
  states?: string[];
  postcodeRanges?: [number, number][];
};

const AREA_ALIASES: Record<string, AreaAlias> = {
  "brisbane": { cities: ["Brisbane"], suburbs: ["Deagon", "Kallangur", "Chermside", "Indooroopilly", "Carindale", "Mt Gravatt", "Strathpine", "Aspley", "Nundah", "Toowong"], states: ["QLD"] },
  "gold coast": { cities: ["Gold Coast"], states: ["QLD"] },
  "sunshine coast": { cities: ["Sunshine Coast"], states: ["QLD"] },
  "central coast": { postcodeRanges: [[2250, 2263]], states: ["NSW"] },
  "western sydney": { suburbs: ["Campbelltown", "Penrith", "Parramatta", "Liverpool", "Blacktown", "Fairfield"], states: ["NSW"] },
  "eastern suburbs": { suburbs: ["Bondi", "Bondi Junction", "Maroubra", "Randwick", "Coogee"], states: ["NSW"] },
  "inner west": { suburbs: ["Ashfield", "Burwood", "Strathfield", "Canterbury"], states: ["NSW"] },
  "north shore": { suburbs: ["Chatswood", "Hornsby", "Gordon", "Macquarie Park"], states: ["NSW"] },
  "melbourne cbd": { postcodeRanges: [[3000, 3008]], states: ["VIC"] },
  "sydney cbd": { postcodeRanges: [[2000, 2011]], states: ["NSW"] },
  "perth": { cities: ["Perth"], states: ["WA"] },
  "adelaide": { cities: ["Adelaide"], states: ["SA"] },
  "hobart": { cities: ["Hobart"], states: ["TAS"] },
  "darwin": { cities: ["Darwin"], states: ["NT"] },
  "canberra": { cities: ["Canberra"], states: ["ACT"] },
  "newcastle": { cities: ["Newcastle"], states: ["NSW"] },
  "wollongong": { cities: ["Wollongong"], states: ["NSW"] },
  "geelong": { cities: ["Geelong"], states: ["VIC"] },
  "townsville": { cities: ["Townsville"], states: ["QLD"] },
  "cairns": { cities: ["Cairns"], states: ["QLD"] },
};

let locationIndex: LocationEntry[] | null = null;

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Load the location index from the database. Lazy-initialized on first use.
 */
async function ensureIndex(): Promise<LocationEntry[]> {
  if (locationIndex) return locationIndex;

  const { getDb } = await import("./db");
  const db = await getDb();

  if (!db) {
    locationIndex = [];
    return locationIndex;
  }

  const rows = await db
    .select({
      id: shoppingCentres.id,
      name: shoppingCentres.name,
      slug: shoppingCentres.slug,
      suburb: shoppingCentres.suburb,
      city: shoppingCentres.city,
      state: shoppingCentres.state,
      postcode: shoppingCentres.postcode,
      latitude: shoppingCentres.latitude,
      longitude: shoppingCentres.longitude,
    })
    .from(shoppingCentres);

  locationIndex = rows.map((r) => ({
    centreId: r.id,
    centreName: r.name,
    slug: r.slug ?? null,
    suburb: r.suburb?.trim() ?? null,
    city: r.city?.trim() ?? null,
    state: r.state?.trim() ?? null,
    postcode: r.postcode ?? null,
    latitude: r.latitude ? parseFloat(r.latitude) : null,
    longitude: r.longitude ? parseFloat(r.longitude) : null,
  }));

  return locationIndex;
}

/**
 * Check if a centre matches a given area alias definition.
 */
function matchesAlias(entry: LocationEntry, alias: AreaAlias): boolean {
  // If the alias specifies states, the centre must be in one of them
  if (alias.states && alias.states.length > 0) {
    if (!entry.state) return false;
    const entryState = entry.state.toUpperCase();
    if (!alias.states.some((s) => s.toUpperCase() === entryState)) return false;
  }

  // Check all criteria — a centre matches if ANY of suburbs/cities/postcodes match
  let hasAnyCriteria = false;

  if (alias.suburbs && alias.suburbs.length > 0) {
    hasAnyCriteria = true;
    if (entry.suburb) {
      const entrySuburb = entry.suburb.toLowerCase().trim();
      if (alias.suburbs.some((s) => s.toLowerCase() === entrySuburb)) return true;
    }
  }

  if (alias.cities && alias.cities.length > 0) {
    hasAnyCriteria = true;
    if (entry.city) {
      const entryCity = entry.city.toLowerCase().trim();
      if (alias.cities.some((c) => c.toLowerCase() === entryCity)) return true;
    }
  }

  if (alias.postcodeRanges && alias.postcodeRanges.length > 0) {
    hasAnyCriteria = true;
    if (entry.postcode) {
      const pc = parseInt(entry.postcode, 10);
      if (!isNaN(pc) && alias.postcodeRanges.some(([lo, hi]) => pc >= lo && pc <= hi)) return true;
    }
  }

  // If we had criteria but none matched, return false
  // If only state was specified (no suburbs/cities/postcodes), the state check above already passed
  return !hasAnyCriteria;
}

/**
 * Find shopping centres in a named area (e.g. "Brisbane", "Central Coast").
 * First checks area aliases, then falls back to suburb/city partial matching.
 */
export async function findCentresByArea(areaQuery: string): Promise<LocationEntry[]> {
  const index = await ensureIndex();
  const normalised = areaQuery.trim().toLowerCase();

  // Check area aliases first
  const alias = AREA_ALIASES[normalised];
  if (alias) {
    return index.filter((entry) => matchesAlias(entry, alias));
  }

  // Fallback: use fuzzy suburb/city matching (handles typos)
  return findCentresBySuburbOrCity(areaQuery);
}

/**
 * Find shopping centres within a radius of given coordinates, sorted by distance.
 */
export async function findCentresNearCoordinates(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<(LocationEntry & { distance: number })[]> {
  const index = await ensureIndex();

  return index
    .filter((e) => e.latitude !== null && e.longitude !== null)
    .map((e) => {
      const distance = calculateDistance(lat, lng, e.latitude!, e.longitude!);
      return { ...e, distance };
    })
    .filter((e) => e.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Find centres whose suburb or city matches the query (case-insensitive partial match),
 * with fuzzy matching (Levenshtein distance ≤ 2) for typo tolerance.
 */
export async function findCentresBySuburbOrCity(query: string): Promise<LocationEntry[]> {
  const index = await ensureIndex();
  const normalised = query.trim().toLowerCase();

  return index.filter((entry) => {
    const suburb = entry.suburb?.trim().toLowerCase() ?? "";
    const city = entry.city?.trim().toLowerCase() ?? "";

    // Exact partial match
    if (suburb.includes(normalised) || city.includes(normalised)) return true;

    // Fuzzy match on whole suburb/city names
    if (suburb && levenshtein(suburb, normalised) <= 2) return true;
    if (city && levenshtein(city, normalised) <= 2) return true;

    return false;
  });
}

/**
 * Clear and rebuild the location index from the database.
 * Call this when shopping centres are added, updated, or removed.
 */
export async function refreshLocationIndex(): Promise<void> {
  locationIndex = null;
  await ensureIndex();
}
