/**
 * Parse search queries to extract site requirements (size, tables, etc.)
 */

export interface ParsedQuery {
  centreName: string;
  minSizeM2?: number;
  minTables?: number;
  productCategory?: string;
  assetType?: 'casual' | 'vacant_shop' | 'third_line'; // Asset type filter
  thirdLineCategory?: string; // Third line category (ATM, Vending Machine, etc.)
  originalQuery: string;
  parsedDate?: string; // ISO format YYYY-MM-DD
  dateRangeEnd?: string; // ISO format YYYY-MM-DD for date ranges
}

/**
 * Parse size requirements from query
 * Supports formats:
 * - "3x4m", "3 x 4m", "3m x 4m" (calculates area)
 * - "12sqm", "12 sqm", "12 square meters"
 * - "15m2", "15 m2"
 */
function parseSizeRequirement(query: string): number | undefined {
  // Match dimensions like "3x4m", "3 x 4m", "3m x 4m", "3x3", "3 by 4", "3by4" (with or without 'm' unit)
  const dimensionMatch = query.match(/(\d+\.?\d*)\s*m?\s*(?:[xX×]|by)\s*(\d+\.?\d*)\s*m?/i);
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
 * Extract asset type from query
 * Supports: "Vacant Shop", "VS", "Vending Machine", "ATM", "Third Line", "3rdL", etc.
 */
function extractAssetType(query: string): 'casual' | 'vacant_shop' | 'third_line' | undefined {
  const lowerQuery = query.toLowerCase();
  
  // Vacant Shop patterns
  if (/\b(vacant\s+shop|vs|vacant)\b/i.test(lowerQuery)) {
    return 'vacant_shop';
  }
  
  // Third Line Income patterns
  if (/\b(third\s+line|3rd\s+line|3rdl|vending|atm|car\s+wash|digital\s+signage|installation)\b/i.test(lowerQuery)) {
    return 'third_line';
  }
  
  // Casual Leasing patterns (explicit)
  if (/\b(casual\s+leasing|casual|pop\s*-?\s*up|popup|pop-up)\b/i.test(lowerQuery)) {
    return 'casual';
  }
  
  return undefined;
}

/**
 * Extract third line category from query
 * Common categories: ATM, Vending Machine, Car Wash, Digital Signage, etc.
 */
function extractThirdLineCategory(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();
  
  const thirdLineCategories = [
    'atm', 'vending machine', 'vending', 'car wash', 'digital signage', 'signage',
    'installation', 'kiosk', 'phone booth', 'mailbox', 'bike rack', 'seating',
    'water fountain', 'bin', 'trash', 'recycling', 'charging station', 'charger'
  ];
  
  for (const category of thirdLineCategories) {
    if (lowerQuery.includes(category)) {
      return category;
    }
  }
  
  return undefined;
}

/**
 * Extract product category keywords from query
 * Common categories: shoes, clothing, food, jewelry, electronics, etc.
 */
function extractProductCategory(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();
  
  // Common product category keywords (will be matched against database categories)
  const categoryKeywords = [
    // Footwear
    'shoes', 'shoe', 'footwear', 'boots', 'boot', 'ugg', 'sneakers', 'sneaker', 'sandals', 'sandal', 'heels', 'heel',
    // Clothing & Fashion
    'clothing', 'apparel', 'fashion', 'accessories', 'accessory',
    // Jewellery
    'jewelry', 'jewellery', 'watches', 'watch', 'rings', 'ring', 'necklaces', 'necklace',
    // Food & Beverage
    'food', 'beverage', 'cafe', 'coffee', 'restaurant', 'bakery', 'wine', 'liquor', 'alcohol',
    // Electronics & Technology
    'electronics', 'electronic', 'tech', 'technology', 'gadgets', 'gadget', 'phones', 'phone', 'computers', 'computer', 'telecommunications',
    // Books & Stationery
    'books', 'book', 'stationery', 'calendars', 'calendar', 'news',
    // Art & Craft
    'art', 'craft', 'handmade', 'hobbies', 'hobby', 'photography',
    // Beauty & Cosmetics
    'beauty', 'cosmetics', 'cosmetic', 'skincare', 'makeup', 'salon', 'barber',
    // Health & Wellness
    'health', 'fitness', 'wellness', 'pharmacy', 'medical', 'pharmaceuticals', 'pharmaceutical',
    // Toys & Kids
    'toys', 'toy', 'games', 'game', 'kids', 'kid', 'children', 'child', 'baby', 'toddler',
    // Home & Furniture
    'home', 'furniture', 'decor', 'homewares', 'bedding', 'household',
    // Pets & Animals
    'pets', 'pet', 'animals', 'animal',
    // Gardening & Outdoor
    'flowers', 'plants', 'garden', 'gardening', 'outdoor',
    // Automotive & Marine
    'automotive', 'vehicles', 'machinery', 'boating', 'marine',
    // Services
    'charity', 'charities', 'government', 'community', 'finance', 'financial', 'insurance', 'real estate', 'property',
    'education', 'recruitment', 'training', 'tourism', 'travel',
    // Other
    'candles', 'entertainment', 'music', 'sporting', 'sports', 'recreation', 'tools', 'electrical',
    'security', 'safety', 'renewable', 'energy', 'utilities', 'vaping', 'smoking', 'tobacco',
  ];
  
  for (const keyword of categoryKeywords) {
    if (lowerQuery.includes(keyword)) {
      return keyword;
    }
  }
  
  return undefined;
}

/**
 * Remove size, table, category, and asset type requirements from query to extract centre name
 */
function extractCentreName(query: string): string {
  let centreName = query;

  // Remove asset type patterns
  centreName = centreName.replace(/\b(vacant\s+shop|vs|vending\s+machine|vending|atm|car\s+wash|digital\s+signage|third\s+line|3rd\s+line|3rdl|casual\s+leasing|casual|pop\s*-?\s*up|popup|pop-up|installation|kiosk|phone\s+booth|mailbox|bike\s+rack|seating|water\s+fountain|bin|trash|recycling|charging\s+station|charger)\b/gi, '');
  
  // Remove dimension patterns (handles "3x4m", "3 x 4m", "3m x 4m", "3x3", "3 by 4", "3by4")
  centreName = centreName.replace(/\d+\.?\d*\s*m?\s*(?:[xX×]|by)\s*\d+\.?\d*\s*m?/gi, '');
  
  // Remove area patterns
  centreName = centreName.replace(/\d+\.?\d*\s*(?:sqm|sq\s*m|square\s*meters?|m2|m\s*2)/gi, '');
  
  // Remove table patterns
  centreName = centreName.replace(/\d+\s*(?:trestle\s*)?tables?/gi, '');
  
  // Remove product category keywords
  const categoryKeywords = [
    // Footwear
    'shoes', 'shoe', 'footwear', 'boots', 'boot', 'ugg', 'sneakers', 'sneaker', 'sandals', 'sandal', 'heels', 'heel',
    // Clothing & Fashion
    'clothing', 'apparel', 'fashion', 'accessories', 'accessory',
    // Jewellery
    'jewelry', 'jewellery', 'watches', 'watch', 'rings', 'ring', 'necklaces', 'necklace',
    // Food & Beverage
    'food', 'beverage', 'cafe', 'coffee', 'restaurant', 'bakery', 'wine', 'liquor', 'alcohol',
    // Electronics & Technology
    'electronics', 'electronic', 'tech', 'technology', 'gadgets', 'gadget', 'phones', 'phone', 'computers', 'computer', 'telecommunications',
    // Books & Stationery
    'books', 'book', 'stationery', 'calendars', 'calendar', 'news',
    // Art & Craft
    'art', 'craft', 'handmade', 'hobbies', 'hobby', 'photography',
    // Beauty & Cosmetics
    'beauty', 'cosmetics', 'cosmetic', 'skincare', 'makeup', 'salon', 'barber',
    // Health & Wellness
    'health', 'fitness', 'wellness', 'pharmacy', 'medical', 'pharmaceuticals', 'pharmaceutical',
    // Toys & Kids
    'toys', 'toy', 'games', 'game', 'kids', 'kid', 'children', 'child', 'baby', 'toddler',
    // Home & Furniture
    'home', 'furniture', 'decor', 'homewares', 'bedding', 'household',
    // Pets & Animals
    'pets', 'pet', 'animals', 'animal',
    // Gardening & Outdoor
    'flowers', 'plants', 'garden', 'gardening', 'outdoor',
    // Automotive & Marine
    'automotive', 'vehicles', 'machinery', 'boating', 'marine',
    // Services
    'charity', 'charities', 'government', 'community', 'finance', 'financial', 'insurance', 'real estate', 'property',
    'education', 'recruitment', 'training', 'tourism', 'travel',
    // Other
    'candles', 'entertainment', 'music', 'sporting', 'sports', 'recreation', 'tools', 'electrical',
    'security', 'safety', 'renewable', 'energy', 'utilities', 'vaping', 'smoking', 'tobacco',
  ];
  
  for (const keyword of categoryKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    centreName = centreName.replace(regex, '');
  }
  
  // Clean up extra whitespace
  centreName = centreName.replace(/\s+/g, ' ').trim();
  
  return centreName;
}

/**
 * Parse natural language date from query
 * Supports formats:
 * - "6 June", "June 6", "6th June", "June 6th"
 * - "6/6", "6/6/2026", "06/06/2026" (Australian DD/MM format)
 * - "from 6 June", "on 6 June", "for 6 June"
 * - "next Monday", "this Friday", "tomorrow", "today"
 * - Date ranges: "6 June to 12 June", "6-12 June", "6 June - 12 June"
 */
function parseDateFromQuery(query: string): { date?: string; endDate?: string; cleanedQuery: string } {
  const lowerQuery = query.toLowerCase();
  let cleanedQuery = query;
  let parsedDate: string | undefined;
  let endDate: string | undefined;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const monthNames: Record<string, number> = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
  };
  
  const dayNames: Record<string, number> = {
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
  };
  
  // Helper to format date as YYYY-MM-DD
  const formatDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  // Helper to get next occurrence of a date (if date has passed this year, use next year)
  const getNextOccurrence = (month: number, day: number): Date => {
    const date = new Date(currentYear, month, day);
    if (date < now) {
      date.setFullYear(currentYear + 1);
    }
    return date;
  };
  
  // Helper to get next weekday
  const getNextWeekday = (targetDay: number, isNext: boolean = false): Date => {
    const result = new Date(now);
    const currentDay = result.getDay();
    let daysToAdd = targetDay - currentDay;
    
    if (isNext) {
      // "next Monday" means the Monday of next week
      daysToAdd = daysToAdd <= 0 ? daysToAdd + 7 : daysToAdd;
      if (daysToAdd <= 7) daysToAdd += 7; // Always go to next week
    } else {
      // "this Monday" or just "Monday" means the coming Monday
      if (daysToAdd <= 0) daysToAdd += 7;
    }
    
    result.setDate(result.getDate() + daysToAdd);
    return result;
  };
  
  // Check for "today" or "tomorrow"
  if (/\btoday\b/i.test(lowerQuery)) {
    parsedDate = formatDate(now);
    cleanedQuery = cleanedQuery.replace(/\btoday\b/gi, '');
  } else if (/\btomorrow\b/i.test(lowerQuery)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    parsedDate = formatDate(tomorrow);
    cleanedQuery = cleanedQuery.replace(/\btomorrow\b/gi, '');
  }
  
  // Check for "next/this [weekday]"
  if (!parsedDate) {
    const weekdayPattern = /\b(next|this)?\s*(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i;
    const weekdayMatch = lowerQuery.match(weekdayPattern);
    if (weekdayMatch) {
      const isNext = weekdayMatch[1]?.toLowerCase() === 'next';
      const dayName = weekdayMatch[2].toLowerCase();
      const targetDay = dayNames[dayName];
      if (targetDay !== undefined) {
        const date = getNextWeekday(targetDay, isNext);
        parsedDate = formatDate(date);
        cleanedQuery = cleanedQuery.replace(weekdayPattern, '');
      }
    }
  }
  
  // Check for date range: "6 June to 12 June", "6-12 June", "6 June - 12 June"
  if (!parsedDate) {
    // Pattern: "6 June to 12 June" or "6 June - 12 June"
    const rangePattern1 = /\b(?:from\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(?:to|until|-|–)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+(\d{4}))?/i;
    const rangeMatch1 = lowerQuery.match(rangePattern1);
    if (rangeMatch1) {
      const startDay = parseInt(rangeMatch1[1]);
      const startMonth = monthNames[rangeMatch1[2].toLowerCase()];
      const endDay = parseInt(rangeMatch1[3]);
      const endMonth = monthNames[rangeMatch1[4].toLowerCase()];
      const year = rangeMatch1[5] ? parseInt(rangeMatch1[5]) : currentYear;
      
      const startDate = getNextOccurrence(startMonth, startDay);
      if (rangeMatch1[5]) startDate.setFullYear(year);
      parsedDate = formatDate(startDate);
      
      const endDateObj = new Date(startDate.getFullYear(), endMonth, endDay);
      endDate = formatDate(endDateObj);
      
      cleanedQuery = cleanedQuery.replace(rangePattern1, '');
    }
    
    // Pattern: "6-12 June" or "6 - 12 June"
    if (!parsedDate) {
      const rangePattern2 = /\b(?:from\s+)?(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+(\d{4}))?/i;
      const rangeMatch2 = lowerQuery.match(rangePattern2);
      if (rangeMatch2) {
        const startDay = parseInt(rangeMatch2[1]);
        const endDay = parseInt(rangeMatch2[2]);
        const month = monthNames[rangeMatch2[3].toLowerCase()];
        const year = rangeMatch2[4] ? parseInt(rangeMatch2[4]) : currentYear;
        
        const startDate = getNextOccurrence(month, startDay);
        if (rangeMatch2[4]) startDate.setFullYear(year);
        parsedDate = formatDate(startDate);
        
        const endDateObj = new Date(startDate.getFullYear(), month, endDay);
        endDate = formatDate(endDateObj);
        
        cleanedQuery = cleanedQuery.replace(rangePattern2, '');
      }
    }
  }
  
  // Check for single date: "6 June", "June 6", "6th June", "June 6th"
  if (!parsedDate) {
    // Pattern: "6 June" or "6th June"
    const datePattern1 = /\b(?:from|on|for)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+(\d{4}))?\b/i;
    const dateMatch1 = lowerQuery.match(datePattern1);
    if (dateMatch1) {
      const day = parseInt(dateMatch1[1]);
      const month = monthNames[dateMatch1[2].toLowerCase()];
      const year = dateMatch1[3] ? parseInt(dateMatch1[3]) : currentYear;
      
      const date = getNextOccurrence(month, day);
      if (dateMatch1[3]) date.setFullYear(year);
      parsedDate = formatDate(date);
      cleanedQuery = cleanedQuery.replace(datePattern1, '');
    }
    
    // Pattern: "June 6" or "June 6th"
    if (!parsedDate) {
      const datePattern2 = /\b(?:from|on|for)?\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?\b/i;
      const dateMatch2 = lowerQuery.match(datePattern2);
      if (dateMatch2) {
        const month = monthNames[dateMatch2[1].toLowerCase()];
        const day = parseInt(dateMatch2[2]);
        const year = dateMatch2[3] ? parseInt(dateMatch2[3]) : currentYear;
        
        const date = getNextOccurrence(month, day);
        if (dateMatch2[3]) date.setFullYear(year);
        parsedDate = formatDate(date);
        cleanedQuery = cleanedQuery.replace(datePattern2, '');
      }
    }
  }
  
  // Check for month-only: "in July", "July", "for July"
  if (!parsedDate) {
    const monthOnlyPattern = /\b(?:in|for|during)?\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+(\d{4}))?\b/i;
    const monthOnlyMatch = lowerQuery.match(monthOnlyPattern);
    if (monthOnlyMatch) {
      const month = monthNames[monthOnlyMatch[1].toLowerCase()];
      const year = monthOnlyMatch[2] ? parseInt(monthOnlyMatch[2]) : currentYear;
      
      // Default to 1st of the month
      const date = getNextOccurrence(month, 1);
      if (monthOnlyMatch[2]) date.setFullYear(year);
      parsedDate = formatDate(date);
      cleanedQuery = cleanedQuery.replace(monthOnlyPattern, '');
    }
  }
  
  // Check for numeric date: "6/6", "06/06", "6/6/2026" (Australian DD/MM format)
  if (!parsedDate) {
    const numericPattern = /\b(?:from|on|for)?\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
    const numericMatch = query.match(numericPattern);
    if (numericMatch) {
      const day = parseInt(numericMatch[1]);
      const month = parseInt(numericMatch[2]) - 1; // 0-indexed
      let year = numericMatch[3] ? parseInt(numericMatch[3]) : currentYear;
      if (year < 100) year += 2000; // Handle 2-digit years
      
      const date = new Date(year, month, day);
      // Only use if it's a valid date
      if (date.getDate() === day && date.getMonth() === month) {
        parsedDate = formatDate(date);
        cleanedQuery = cleanedQuery.replace(numericPattern, '');
      }
    }
  }
  
  // Clean up prepositions and extra whitespace
  cleanedQuery = cleanedQuery
    .replace(/\b(from|on|for|at|in)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { date: parsedDate, endDate, cleanedQuery };
}

/**
 * Parse a search query to extract centre name and site requirements
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const trimmedQuery = query.trim();
  
  // First extract date from query
  const { date: parsedDate, endDate, cleanedQuery } = parseDateFromQuery(trimmedQuery);
  
  return {
    centreName: extractCentreName(cleanedQuery),
    minSizeM2: parseSizeRequirement(cleanedQuery),
    minTables: parseTableRequirement(cleanedQuery),
    productCategory: extractProductCategory(cleanedQuery),
    assetType: extractAssetType(cleanedQuery),
    thirdLineCategory: extractThirdLineCategory(cleanedQuery),
    originalQuery: trimmedQuery,
    parsedDate,
    dateRangeEnd: endDate,
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
