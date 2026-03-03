/**
 * Category synonym mapping for handling common product category variations
 * Maps user search terms to standard category names
 *
 * Run periodically to find unrecognised category terms from real searches:
 *   SELECT query, parsedIntent->>'productCategory' AS category, COUNT(*)
 *   FROM search_analytics
 *   WHERE (parsedIntent->>'categoryUnrecognised')::boolean = true
 *   GROUP BY query, category
 *   ORDER BY count DESC;
 */

export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  // Footwear variations
  "shoes": ["shoe", "footwear", "sneakers", "boots"],
  "ugg": ["uggs", "ugg boots", "sheepskin boots", "shoes", "footwear"],
  "uggs": ["ugg", "ugg boots", "sheepskin boots", "shoes", "footwear"],
  "boots": ["boot", "footwear", "shoes"],
  "sneakers": ["sneaker", "shoes", "footwear", "trainers"],
  "socks": ["sock", "footwear", "clothing", "apparel", "fashion"],
  "sock": ["socks", "footwear", "clothing", "apparel", "fashion"],
  "thongs": ["thong", "footwear", "sandals", "shoes"],
  
  // Clothing & Apparel variations
  "clothes": ["clothing", "apparel", "fashion", "wear"],
  "clothing": ["clothes", "apparel", "fashion", "wear"],
  "fashion": ["clothes", "clothing", "apparel"],
  "beanies": ["beanie", "clothing", "apparel", "fashion", "accessories"],
  "beanie": ["beanies", "clothing", "apparel", "fashion", "accessories"],
  "scarves": ["scarf", "clothing", "apparel", "fashion", "accessories"],
  "scarf": ["scarves", "clothing", "apparel", "fashion", "accessories"],
  "gloves": ["glove", "clothing", "apparel", "fashion", "accessories"],
  "belts": ["belt", "clothing", "apparel", "fashion", "accessories"],
  "belt": ["belts", "clothing", "apparel", "fashion", "accessories"],
  "hats": ["hat", "clothing", "apparel", "fashion", "accessories"],
  "hat": ["hats", "clothing", "apparel", "fashion", "accessories"],
  "caps": ["cap", "clothing", "apparel", "fashion", "accessories", "hats"],
  "cap": ["caps", "clothing", "apparel", "fashion", "accessories", "hats"],
  "swimwear": ["swimming", "clothing", "apparel", "fashion"],
  "activewear": ["sportswear", "clothing", "apparel", "fashion", "fitness"],
  "sportswear": ["activewear", "clothing", "apparel", "fashion", "fitness"],
  "uniforms": ["uniform", "clothing", "apparel", "workwear"],
  "workwear": ["uniform", "uniforms", "clothing", "apparel"],
  
  // Bags & Luggage variations
  "handbags": ["handbag", "bags", "fashion", "accessories"],
  "handbag": ["handbags", "bags", "fashion", "accessories"],
  "bags": ["bag", "handbags", "luggage", "fashion", "accessories"],
  "bag": ["bags", "handbags", "luggage", "fashion", "accessories"],
  "luggage": ["bags", "suitcase", "travel"],
  "wallets": ["wallet", "fashion", "accessories", "leather goods"],
  "wallet": ["wallets", "fashion", "accessories", "leather goods"],
  
  // Eyewear variations
  "sunglasses": ["sunnies", "eyewear", "fashion", "accessories"],
  "sunnies": ["sunglasses", "eyewear", "fashion", "accessories"],
  
  // Watches (extend existing jewellery group)
  "watches": ["watch", "jewellery", "jewelry", "accessories"],
  "watch": ["watches", "jewellery", "jewelry", "accessories"],
  "accessories": ["accessory", "fashion", "jewellery", "jewelry"],
  "accessory": ["accessories", "fashion", "jewellery", "jewelry"],
  
  // Food & Beverage variations
  "food": ["foods", "dining", "restaurant", "cafe", "eatery"],
  "cafe": ["coffee", "cafes", "coffee shop"],
  "coffee": ["cafe", "cafes", "coffee shop"],
  
  // Electronics variations
  "electronics": ["electronic", "tech", "technology", "gadgets"],
  "tech": ["technology", "electronics", "gadgets"],
  
  // Beauty variations
  "beauty": ["cosmetics", "makeup", "skincare"],
  "cosmetics": ["beauty", "makeup", "skincare"],
  
  // Pet variations
  "pets": ["pet", "animals", "pet supplies"],
  "pet": ["pets", "animals", "pet supplies"],
  
  // Jewelry variations
  "jewelry": ["jewellery", "jeweler", "jeweller", "accessories"],
  "jewellery": ["jewelry", "jeweler", "jeweller", "accessories"],
  
  // Books variations
  "books": ["book", "bookstore", "bookshop", "reading"],
  "book": ["books", "bookstore", "bookshop", "reading"],
  
  // Toys variations
  "toys": ["toy", "games", "playthings"],
  "toy": ["toys", "games", "playthings"],
  
  // Sports variations
  "sports": ["sport", "sporting goods", "athletics", "fitness"],
  "sport": ["sports", "sporting goods", "athletics", "fitness"],
  "gym": ["fitness", "sports", "exercise"],
  
  // Home & Garden variations
  "home": ["homeware", "homewares", "household"],
  "garden": ["gardening", "plants", "nursery"],
  
  // Charity variations
  "charity": ["charities", "non-profit", "nonprofit", "fundraising", "community"],
  "charities": ["charity", "non-profit", "nonprofit", "fundraising", "community"],
};

/**
 * Expand a search keyword to include all its synonyms
 * @param keyword - The original search keyword
 * @returns Array of keywords including the original and all synonyms
 */
export function expandCategoryKeyword(keyword: string): string[] {
  const lowerKeyword = keyword.toLowerCase().trim();
  
  // Start with the original keyword
  const expanded = [lowerKeyword];
  
  // Add synonyms if they exist
  if (CATEGORY_SYNONYMS[lowerKeyword]) {
    expanded.push(...CATEGORY_SYNONYMS[lowerKeyword]);
  }
  
  // Remove duplicates
  return Array.from(new Set(expanded));
}

/**
 * Check if a keyword matches a category name using synonyms
 * @param keyword - User's search keyword
 * @param categoryName - Database category name
 * @param threshold - Fuzzy matching threshold (0-1)
 * @returns True if keyword matches category (including synonyms)
 */
export function matchesWithSynonyms(
  keyword: string,
  categoryName: string,
  fuzzyMatch: (kw: string, cat: string, threshold: number) => boolean,
  threshold: number = 0.6
): boolean {
  const expandedKeywords = expandCategoryKeyword(keyword);
  const catLower = categoryName.toLowerCase();
  
  // Check if any expanded keyword matches the category
  for (const kw of expandedKeywords) {
    // Direct substring match
    if (catLower.includes(kw)) return true;
    
    // Fuzzy match
    if (fuzzyMatch(kw, catLower, threshold)) return true;
  }
  
  return false;
}
