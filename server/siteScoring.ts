import type { ParsedQuery } from "../shared/queryParser";

export type SiteScore = {
  siteId: number;
  total: number;
  categoryMatch: number;
  locationMatch: number;
  availability: number;
  priceMatch: number;
  sizeMatch: number;
  reasons: string[];
};

/**
 * Score a site 0–100 based on how well it matches the user's search intent.
 *
 * Breakdown:
 *   Category match  0–30
 *   Location match  0–25
 *   Availability    0–20
 *   Price match     0–15
 *   Size match      0–10
 */
export function scoreSite(
  site: any,
  categories: any[],
  availabilityData: { week1Available: boolean; week2Available: boolean } | undefined,
  query: ParsedQuery,
  isExactLocationMatch: boolean,
): SiteScore {
  const reasons: string[] = [];

  // --- Category match (0–30) ---
  let categoryMatch = 0;
  if (!query.productCategory) {
    categoryMatch = 25;
  } else if (categories.length === 0) {
    categoryMatch = 10;
    reasons.push("Category needs manual approval at this site");
  } else {
    const lowerCat = query.productCategory.toLowerCase();
    const exactMatch = categories.some(
      (cat: any) => cat.name?.toLowerCase().includes(lowerCat),
    );
    if (exactMatch) {
      categoryMatch = 30;
      reasons.push(`✅ ${query.productCategory} is an approved category`);
    } else {
      categoryMatch = 0;
      reasons.push(`⚠️ ${query.productCategory} is not approved here`);
    }
  }

  // --- Location match (0–25) ---
  let locationMatch = 25;
  if (query.centreName || query.matchedLocation) {
    if (isExactLocationMatch) {
      locationMatch = 25;
      reasons.push("✅ Exact location match");
    } else if (query.stateFilter) {
      locationMatch = 10;
      reasons.push("⚠️ Same state, different area");
    } else {
      locationMatch = 15;
    }
  }

  // --- Availability (0–20) ---
  let availability = 0;
  if (!availabilityData) {
    availability = 10;
  } else if (availabilityData.week1Available) {
    availability = 20;
    reasons.push("✅ Available this week");
  } else if (availabilityData.week2Available) {
    availability = 15;
    reasons.push("⚠️ Available next week");
  } else {
    availability = 0;
    reasons.push("❌ Not available in the next 2 weeks");
  }

  // --- Price match (0–15) ---
  let priceMatch = 15;
  const sitePrice = parseFloat(site.pricePerDay) || 0;
  const sitePriceWeek = parseFloat(site.pricePerWeek) || 0;

  if (query.maxPricePerDay && sitePrice > 0) {
    if (sitePrice <= query.maxPricePerDay) {
      priceMatch = 15;
      reasons.push(`✅ $${sitePrice}/day is within budget`);
    } else if (sitePrice <= query.maxPricePerDay * 1.2) {
      priceMatch = 10;
      reasons.push(`⚠️ $${sitePrice}/day is slightly over budget`);
    } else {
      priceMatch = 0;
      reasons.push(`❌ $${sitePrice}/day exceeds budget of $${query.maxPricePerDay}/day`);
    }
  } else if (query.maxPricePerWeek && sitePriceWeek > 0) {
    if (sitePriceWeek <= query.maxPricePerWeek) {
      priceMatch = 15;
      reasons.push(`✅ $${sitePriceWeek}/week is within budget`);
    } else if (sitePriceWeek <= query.maxPricePerWeek * 1.2) {
      priceMatch = 10;
      reasons.push(`⚠️ $${sitePriceWeek}/week is slightly over budget`);
    } else {
      priceMatch = 0;
      reasons.push(`❌ $${sitePriceWeek}/week exceeds budget`);
    }
  } else if (query.maxBudget && sitePrice > 0) {
    const estimatedWeekCost = sitePrice * 7;
    if (estimatedWeekCost <= query.maxBudget) {
      priceMatch = 15;
      reasons.push(`✅ Estimated ~$${estimatedWeekCost}/week is within budget`);
    } else {
      priceMatch = 5;
      reasons.push(`⚠️ May exceed total budget of $${query.maxBudget}`);
    }
  }

  // --- Size match (0–10) ---
  let sizeMatch = 10;
  if (query.minSizeM2) {
    const siteSize = parseSiteSize(site.size || "");
    if (!siteSize) {
      sizeMatch = 5;
    } else if (siteSize >= query.minSizeM2) {
      sizeMatch = 10;
      reasons.push(`✅ ${siteSize}m² meets your ${query.minSizeM2}m² requirement`);
    } else if (siteSize >= query.minSizeM2 * 0.8) {
      sizeMatch = 7;
      reasons.push(`⚠️ ${siteSize}m² is close to your ${query.minSizeM2}m² requirement`);
    } else {
      sizeMatch = 0;
      reasons.push(`❌ ${siteSize}m² is smaller than your ${query.minSizeM2}m² requirement`);
    }
  }

  const total = categoryMatch + locationMatch + availability + priceMatch + sizeMatch;

  return {
    siteId: site.id,
    total,
    categoryMatch,
    locationMatch,
    availability,
    priceMatch,
    sizeMatch,
    reasons,
  };
}

/**
 * Score and rank an array of sites, returning them sorted best-first.
 */
export function scoreAndRankSites(
  sites: any[],
  siteCategories: Record<number, any[]>,
  availabilityMap: Map<number, { week1Available: boolean; week2Available: boolean }>,
  query: ParsedQuery,
  exactLocationCentreIds: Set<number>,
): { sites: any[]; scores: Record<number, SiteScore> } {
  const scores: Record<number, SiteScore> = {};

  for (const site of sites) {
    const categories = siteCategories[site.id] || [];
    const avail = availabilityMap.get(site.id);
    const isExact = exactLocationCentreIds.has(site.centreId ?? site.centreId);
    scores[site.id] = scoreSite(site, categories, avail, query, isExact);
  }

  const sorted = [...sites].sort(
    (a, b) => (scores[b.id]?.total ?? 0) - (scores[a.id]?.total ?? 0),
  );

  return { sites: sorted, scores };
}

function parseSiteSize(sizeStr: string): number | undefined {
  if (!sizeStr) return undefined;
  const dimensionMatch = sizeStr.match(
    /(\d+\.?\d*)\s*m?\s*[xX×]\s*(\d+\.?\d*)\s*m?/,
  );
  if (dimensionMatch) {
    return parseFloat(dimensionMatch[1]) * parseFloat(dimensionMatch[2]);
  }
  const areaMatch = sizeStr.match(
    /(\d+\.?\d*)\s*(?:sqm|sq\s*m|square\s*meters?|m2|m\s*2)?/i,
  );
  if (areaMatch) {
    return parseFloat(areaMatch[1]);
  }
  return undefined;
}
