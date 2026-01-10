/**
 * Generate abbreviated 4-letter centre code from centre name
 * Examples:
 * - "Campbelltown Mall" → "CAMP"
 * - "Highlands Marketplace" → "HIGH"
 * - "Westfield Parramatta" → "WEST"
 */
export function generateAbbreviatedCentreCode(centreName: string): string {
  // Clean and split into words (keep all words including Mall, Marketplace, etc.)
  const words = centreName.trim().split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) {
    // Fallback: use first 4 letters of original name
    return centreName.substring(0, 4).toUpperCase().padEnd(4, 'X');
  }
  
  if (words.length === 1) {
    // Single word: take first 4 letters
    return words[0].substring(0, 4).toUpperCase().padEnd(4, 'X');
  }
  
  // Multiple words: try to create meaningful abbreviation
  if (words.length === 2) {
    // Two words: take first 2 letters of each
    const first = words[0].substring(0, 2).toUpperCase();
    const second = words[1].substring(0, 2).toUpperCase();
    return (first + second).padEnd(4, 'X');
  }
  
  // Three or more words: take first letter of first 4 words, or first 2 of first word + first letter of next 2
  if (words.length >= 4) {
    return (words[0][0] + words[1][0] + words[2][0] + words[3][0]).toUpperCase();
  }
  
  // Three words: first 2 letters of first word + first letter of next 2
  const first = words[0].substring(0, 2).toUpperCase();
  const second = words[1][0].toUpperCase();
  const third = words[2][0].toUpperCase();
  return first + second + third;
}

/**
 * Get or generate centre code for booking number
 * Uses existing centreCode if available, otherwise generates abbreviated code
 */
export function getCentreCodeForBooking(centre: { id: number; centreCode: string | null; name: string }): string {
  // If centre already has a code, check if it's abbreviated (4 chars or less)
  if (centre.centreCode) {
    // If it's already short (4 chars or less), use it
    if (centre.centreCode.length <= 4) {
      return centre.centreCode.toUpperCase();
    }
    // If it's the old long format, generate abbreviated version
    return generateAbbreviatedCentreCode(centre.name);
  }
  
  // No code exists, generate one
  return generateAbbreviatedCentreCode(centre.name);
}
