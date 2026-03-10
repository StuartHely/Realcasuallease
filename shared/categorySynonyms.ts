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
  // Footwear variations — each subcategory is distinct; don't cross-match
  "shoes": ["shoe"],
  "shoe": ["shoes"],
  "footwear": ["shoes", "shoe"],
  "ugg boots": ["ugg boot", "ugg", "uggs", "sheepskin boots"],
  "ugg boot": ["ugg boots", "ugg", "uggs", "sheepskin boots"],
  "ugg": ["uggs", "ugg boots", "sheepskin boots"],
  "uggs": ["ugg", "ugg boots", "sheepskin boots"],
  "boots": ["boot"],
  "boot": ["boots"],
  "sneakers": ["sneaker", "trainers"],
  "sneaker": ["sneakers"],
  "sandals": ["sandal", "thongs"],
  "sandal": ["sandals"],
  "heels": ["heel"],
  "heel": ["heels"],
  "socks": ["sock"],
  "sock": ["socks"],
  "thongs": ["thong", "sandals"],
  
  // Clothing & Apparel variations
  "clothes": ["clothing", "apparel", "fashion", "wear"],
  "clothing": ["clothes", "apparel", "fashion", "wear"],
  "apparel": ["clothing", "clothes", "fashion"],
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
  
  // Jewellery & Watches
  "watches": ["watch", "jewellery", "jewelry", "accessories"],
  "watch": ["watches", "jewellery", "jewelry", "accessories"],
  "rings": ["ring", "jewellery", "jewelry", "accessories"],
  "ring": ["rings", "jewellery", "jewelry", "accessories"],
  "necklaces": ["necklace", "jewellery", "jewelry", "accessories"],
  "necklace": ["necklaces", "jewellery", "jewelry", "accessories"],
  "accessories": ["accessory", "fashion", "jewellery", "jewelry"],
  "accessory": ["accessories", "fashion", "jewellery", "jewelry"],
  "jewelry": ["jewellery", "jeweler", "jeweller", "accessories"],
  "jewellery": ["jewelry", "jeweler", "jeweller", "accessories"],
  
  // Food & Beverage variations
  "food": ["foods", "dining", "restaurant", "cafe", "eatery"],
  "beverage": ["beverages", "drinks", "food", "cafe"],
  "cafe": ["coffee", "cafes", "coffee shop", "food"],
  "coffee": ["cafe", "cafes", "coffee shop", "food"],
  "restaurant": ["dining", "food", "eatery"],
  "bakery": ["baked goods", "food", "cafe"],
  "wine": ["liquor", "alcohol", "beverages"],
  "liquor": ["alcohol", "wine", "beverages"],
  "alcohol": ["liquor", "wine", "beverages"],
  
  // Electronics & Technology
  "electronics": ["electronic", "tech", "technology", "gadgets"],
  "electronic": ["electronics", "tech", "technology"],
  "tech": ["technology", "electronics", "gadgets"],
  "technology": ["tech", "electronics", "gadgets"],
  "gadgets": ["gadget", "electronics", "tech"],
  "gadget": ["gadgets", "electronics", "tech"],
  "phones": ["phone", "telecommunications", "electronics", "mobile"],
  "phone": ["phones", "telecommunications", "electronics", "mobile"],
  "computers": ["computer", "electronics", "tech", "technology"],
  "computer": ["computers", "electronics", "tech", "technology"],
  "telecommunications": ["phones", "phone", "electronics", "mobile"],
  
  // Books & Stationery
  "books": ["book", "bookstore", "bookshop", "reading"],
  "book": ["books", "bookstore", "bookshop", "reading"],
  "stationery": ["office supplies", "paper", "pens"],
  "calendars": ["calendar", "stationery", "books"],
  "calendar": ["calendars", "stationery", "books"],
  "news": ["newsagent", "newspapers", "magazines", "books"],
  
  // Art & Craft
  "art": ["arts", "craft", "gallery", "creative"],
  "craft": ["crafts", "art", "handmade", "creative"],
  "handmade": ["craft", "art", "artisan"],
  "hobbies": ["hobby", "craft", "recreation"],
  "hobby": ["hobbies", "craft", "recreation"],
  "photography": ["photo", "photos", "camera", "art"],
  "picture": ["pictures", "art", "frame", "photography"],
  "pictures": ["picture", "art", "frame", "photography"],
  "display": ["displays", "exhibition", "art"],
  "displays": ["display", "exhibition", "art"],
  "frame": ["frames", "framing", "picture", "art"],
  "frames": ["frame", "framing", "picture", "art"],
  "framing": ["frame", "frames", "picture", "art"],
  "canvas": ["art", "painting", "craft"],
  
  // Beauty & Cosmetics
  "beauty": ["cosmetics", "makeup", "skincare"],
  "cosmetics": ["beauty", "makeup", "skincare"],
  "cosmetic": ["cosmetics", "beauty", "makeup"],
  "skincare": ["beauty", "cosmetics", "skin care"],
  "makeup": ["beauty", "cosmetics", "skincare"],
  "salon": ["beauty", "hair", "barber"],
  "barber": ["salon", "hair", "beauty"],
  
  // Health & Wellness
  "health": ["wellness", "medical", "pharmacy", "fitness"],
  "fitness": ["health", "gym", "sports", "wellness"],
  "wellness": ["health", "fitness", "medical"],
  "pharmacy": ["pharmaceutical", "medical", "health", "chemist"],
  "medical": ["health", "pharmacy", "pharmaceutical"],
  "pharmaceuticals": ["pharmaceutical", "pharmacy", "medical", "health"],
  "pharmaceutical": ["pharmaceuticals", "pharmacy", "medical", "health"],
  
  // Toys & Kids
  "toys": ["toy", "games", "playthings", "children"],
  "toy": ["toys", "games", "playthings", "children"],
  "games": ["game", "toys", "entertainment", "recreation"],
  "game": ["games", "toys", "entertainment"],
  "kids": ["kid", "children", "child", "toys", "baby"],
  "kid": ["kids", "children", "child", "toys"],
  "children": ["child", "kids", "kid", "toys", "baby"],
  "child": ["children", "kids", "kid", "toys"],
  "baby": ["toddler", "children", "kids", "infant"],
  "toddler": ["baby", "children", "kids", "infant"],
  
  // Home & Furniture
  "home": ["homeware", "homewares", "household"],
  "furniture": ["home", "homewares", "household", "decor"],
  "decor": ["home", "homewares", "decoration", "interior"],
  "homewares": ["home", "homeware", "household", "decor"],
  "bedding": ["home", "homewares", "linen", "household"],
  "household": ["home", "homewares", "homeware"],
  
  // Candles & Gifts
  "candles": ["candle", "home", "homewares", "gifts", "decor"],
  "candle": ["candles", "home", "homewares", "gifts", "decor"],
  
  // Pets & Animals
  "pets": ["pet", "animals", "pet supplies"],
  "pet": ["pets", "animals", "pet supplies"],
  "animals": ["animal", "pets", "pet"],
  "animal": ["animals", "pets", "pet"],
  
  // Gardening & Outdoor
  "flowers": ["florist", "plants", "garden"],
  "florist": ["flowers", "plants", "garden"],
  "plants": ["garden", "flowers", "nursery"],
  "garden": ["gardening", "plants", "nursery"],
  "gardening": ["garden", "plants", "nursery", "outdoor"],
  "outdoor": ["garden", "sporting", "recreation"],
  
  // Automotive & Marine
  "automotive": ["vehicles", "car", "auto"],
  "vehicles": ["automotive", "car", "auto"],
  "machinery": ["equipment", "tools", "industrial"],
  "boating": ["marine", "boats", "water"],
  "marine": ["boating", "boats", "water"],
  
  // Services & Community
  "charity": ["charities", "non-profit", "nonprofit", "fundraising", "community"],
  "charities": ["charity", "non-profit", "nonprofit", "fundraising", "community"],
  "government": ["community", "public", "council"],
  "community": ["charity", "government", "non-profit"],
  "finance": ["financial", "banking", "insurance"],
  "financial": ["finance", "banking", "insurance"],
  "insurance": ["finance", "financial", "banking"],
  "real estate": ["property", "realty", "housing"],
  "property": ["real estate", "realty", "housing"],
  "education": ["training", "learning", "school"],
  "recruitment": ["employment", "jobs", "staffing"],
  "training": ["education", "learning", "courses"],
  "tourism": ["travel", "holiday", "tours"],
  "travel": ["tourism", "holiday", "luggage"],
  
  // Entertainment & Music
  "entertainment": ["music", "recreation", "events"],
  "music": ["entertainment", "musical", "instruments"],
  "sporting": ["sports", "sport", "recreation", "fitness"],
  "sports": ["sport", "sporting goods", "athletics", "fitness"],
  "sport": ["sports", "sporting goods", "athletics", "fitness"],
  "recreation": ["entertainment", "sports", "hobbies"],
  "gym": ["fitness", "sports", "exercise"],
  
  // Tools & Electrical
  "tools": ["hardware", "equipment", "electrical"],
  "electrical": ["electronics", "tools", "hardware"],
  
  // Security & Safety
  "security": ["safety", "surveillance", "protection"],
  "safety": ["security", "protection", "first aid"],
  
  // Energy & Utilities
  "renewable": ["energy", "solar", "green"],
  "energy": ["renewable", "utilities", "solar"],
  "utilities": ["energy", "services"],
  
  // Smoking & Vaping
  "vaping": ["vape", "e-cigarette", "smoking", "tobacco"],
  "smoking": ["tobacco", "cigarettes", "vaping"],
  "tobacco": ["smoking", "cigarettes", "vaping"],
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
