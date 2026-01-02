/**
 * Parse search queries to extract site requirements (size, tables, etc.)
 */

export interface ParsedQuery {
  centreName: string;
  minSizeM2?: number;
  minTables?: number;
  originalQuery: string;
}

/**
 * Parse size requirements from query
 * Supports formats:
 * - "3x4m", "3 x 4m", "3m x 4m" (calculates area)
 * - "12sqm", "12 sqm", "12 square meters"
 * - "15m2", "15 m2"
 */
function parseSizeRequirement(query: string): number | undefined {
  // Match dimensions like "3x4m", "3 x 4m", "3m x 4m"
  const dimensionMatch = query.match(/(\d+\.?\d*)\s*m?\s*[xX×]\s*(\d+\.?\d*)\s*m/i);
  if (dimensionMatch) {
    const width = parseFloat(dimensionMatch[1]);
    const length = parseFloat(dimensionMatch[2]);
    return width * length;
  }

  // Match area like "12sqm", "12 sqm", "12 square meters"
  const sqmMatch = query.match(/(\d+\.?\d*)\s*(?:sqm|sq\s*m|square\s*meters?|m2|m\s*2)/i);
  if (sqmMatch) {
    return parseFloat(sqmMatch[1]);
  }

  return undefined;
}

/**
 * Parse table requirements from query
 * Supports formats:
 * - "5 tables", "3 trestle tables"
 * - "2 table", "1 trestle"
 */
function parseTableRequirement(query: string): number | undefined {
  const tableMatch = query.match(/(\d+)\s*(?:trestle\s*)?tables?/i);
  if (tableMatch) {
    return parseInt(tableMatch[1]);
  }
  return undefined;
}

/**
 * Remove size and table requirements from query to extract centre name
 */
function extractCentreName(query: string): string {
  let centreName = query;

  // Remove dimension patterns (handles "3x4m", "3 x 4m", "3m x 4m")
  centreName = centreName.replace(/\d+\.?\d*\s*m?\s*[xX×]\s*\d+\.?\d*\s*m/gi, '');
  
  // Remove area patterns
  centreName = centreName.replace(/\d+\.?\d*\s*(?:sqm|sq\s*m|square\s*meters?|m2|m\s*2)/gi, '');
  
  // Remove table patterns
  centreName = centreName.replace(/\d+\s*(?:trestle\s*)?tables?/gi, '');
  
  // Clean up extra whitespace
  centreName = centreName.replace(/\s+/g, ' ').trim();
  
  return centreName;
}

/**
 * Parse a search query to extract centre name and site requirements
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const trimmedQuery = query.trim();
  
  return {
    centreName: extractCentreName(trimmedQuery),
    minSizeM2: parseSizeRequirement(trimmedQuery),
    minTables: parseTableRequirement(trimmedQuery),
    originalQuery: trimmedQuery,
  };
}

/**
 * Check if a site meets the parsed requirements
 */
export function siteMatchesRequirements(
  site: { size?: string | null; maxTables?: number | null },
  requirements: ParsedQuery
): boolean {
  // Check size requirement
  if (requirements.minSizeM2 !== undefined && site.size) {
    const siteSize = parseSiteSize(site.size);
    if (siteSize === undefined || siteSize < requirements.minSizeM2) {
      return false;
    }
  }

  // Check table requirement
  if (requirements.minTables !== undefined) {
    if (!site.maxTables || site.maxTables < requirements.minTables) {
      return false;
    }
  }

  return true;
}

/**
 * Parse site size string to square meters
 * Handles formats like "3m x 4m", "12sqm", "3 x 4", etc.
 */
function parseSiteSize(sizeStr: string): number | undefined {
  if (!sizeStr) return undefined;

  // Try dimension format first (handles "4m x 4m", "3 x 4", etc.)
  const dimensionMatch = sizeStr.match(/(\d+\.?\d*)\s*m?\s*[xX×]\s*(\d+\.?\d*)\s*m?/);
  if (dimensionMatch) {
    const width = parseFloat(dimensionMatch[1]);
    const length = parseFloat(dimensionMatch[2]);
    return width * length;
  }

  // Try area format
  const areaMatch = sizeStr.match(/(\d+\.?\d*)\s*(?:sqm|sq\s*m|square\s*meters?|m2|m\s*2)?/i);
  if (areaMatch) {
    return parseFloat(areaMatch[1]);
  }

  return undefined;
}
