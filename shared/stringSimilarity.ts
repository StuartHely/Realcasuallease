/**
 * String similarity utilities for fuzzy matching
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to change one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0 to 1, where 1 is identical)
 * Uses normalized Levenshtein distance
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLength);
}

/**
 * Check if a keyword fuzzy matches a category name
 * Returns true if similarity is above threshold or if substring match exists
 * 
 * @param keyword - User's search keyword (e.g., "pet", "pets")
 * @param categoryName - Database category name (e.g., "Pets & Animals", "Pet Supplies")
 * @param threshold - Minimum similarity score (0-1), default 0.6
 */
export function fuzzyMatchCategory(keyword: string, categoryName: string, threshold: number = 0.6): boolean {
  const kw = keyword.toLowerCase();
  const cat = categoryName.toLowerCase();
  
  // Exact substring match (fast path)
  if (cat.includes(kw)) return true;
  
  // Split category name into words and check each word
  const categoryWords = cat.split(/[\s&,\-]+/).filter(w => w.length > 2);
  
  for (const word of categoryWords) {
    // Check substring match for each word
    if (word.includes(kw)) return true;
    
    // Check similarity score
    const similarity = stringSimilarity(kw, word);
    if (similarity >= threshold) return true;
  }
  
  return false;
}

/**
 * Find best matching categories for a keyword
 * Returns array of category names sorted by similarity score
 * 
 * @param keyword - User's search keyword
 * @param categories - Array of category names to search
 * @param maxResults - Maximum number of results to return
 * @param threshold - Minimum similarity score to include
 */
export function findBestCategoryMatches(
  keyword: string,
  categories: string[],
  maxResults: number = 5,
  threshold: number = 0.5
): string[] {
  const kw = keyword.toLowerCase();
  
  // Calculate similarity for each category
  const scored = categories.map(cat => {
    const catLower = cat.toLowerCase();
    
    // Exact substring match gets highest score
    if (catLower.includes(kw)) return { category: cat, score: 1.0 };
    
    // Check word-by-word similarity
    const categoryWords = catLower.split(/[\s&,\-]+/).filter(w => w.length > 2);
    let maxScore = 0;
    
    for (const word of categoryWords) {
      if (word.includes(kw)) {
        maxScore = Math.max(maxScore, 0.9);
      } else {
        const similarity = stringSimilarity(kw, word);
        maxScore = Math.max(maxScore, similarity);
      }
    }
    
    return { category: cat, score: maxScore };
  });
  
  // Filter by threshold and sort by score
  return scored
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.category);
}
