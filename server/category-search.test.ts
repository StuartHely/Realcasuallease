import { describe, it, expect, beforeAll } from 'vitest';
import { expandCategoryKeyword } from '../shared/categorySynonyms';
import { fuzzyMatchCategory } from '../shared/stringSimilarity';

describe('Category Search with Prepositions', () => {
  // Test preposition handling in category search
  describe('Preposition Removal', () => {
    const prepositions = ['at', 'in', 'on', 'for', 'near', 'by', 'from', 'to', 'the', 'a', 'an'];
    
    it('should identify common prepositions', () => {
      expect(prepositions).toContain('at');
      expect(prepositions).toContain('in');
      expect(prepositions).toContain('on');
      expect(prepositions).toContain('for');
      expect(prepositions).toContain('near');
    });
    
    it('should filter out prepositions from query words', () => {
      const query = 'charity at bondi';
      const categoryKeyword = 'charity';
      const lowerQuery = query.toLowerCase();
      
      const queryWordsWithoutCategory = lowerQuery.split(/\s+/).filter(word => 
        word !== categoryKeyword.toLowerCase() && 
        !expandCategoryKeyword(categoryKeyword).includes(word) &&
        !prepositions.includes(word)
      );
      
      // Should only have 'bondi' left after removing 'charity' and 'at'
      expect(queryWordsWithoutCategory).toEqual(['bondi']);
    });
    
    it('should handle multiple prepositions in query', () => {
      const query = 'fashion at the mall in sydney';
      const categoryKeyword = 'fashion';
      const lowerQuery = query.toLowerCase();
      
      const queryWordsWithoutCategory = lowerQuery.split(/\s+/).filter(word => 
        word !== categoryKeyword.toLowerCase() && 
        !expandCategoryKeyword(categoryKeyword).includes(word) &&
        !prepositions.includes(word)
      );
      
      // Should have 'mall' and 'sydney' left
      expect(queryWordsWithoutCategory).toEqual(['mall', 'sydney']);
    });
  });
  
  // Test word-by-word matching
  describe('Word-by-Word Centre Name Matching', () => {
    it('should match "bondi" in "eastgate bondi junction"', () => {
      const centreName = 'eastgate bondi junction';
      const queryWords = ['bondi'];
      
      const allWordsMatch = queryWords.every(word => centreName.includes(word));
      expect(allWordsMatch).toBe(true);
    });
    
    it('should match "pacific" and "square" in "pacific square maroubra"', () => {
      const centreName = 'pacific square maroubra';
      const queryWords = ['pacific', 'square'];
      
      const allWordsMatch = queryWords.every(word => centreName.includes(word));
      expect(allWordsMatch).toBe(true);
    });
    
    it('should NOT match "sydney" in "eastgate bondi junction"', () => {
      const centreName = 'eastgate bondi junction';
      const queryWords = ['sydney'];
      
      const allWordsMatch = queryWords.every(word => centreName.includes(word));
      expect(allWordsMatch).toBe(false);
    });
    
    it('should match partial words like "high" in "highlands marketplace"', () => {
      const centreName = 'highlands marketplace';
      const queryWords = ['high'];
      
      const allWordsMatch = queryWords.every(word => centreName.includes(word));
      expect(allWordsMatch).toBe(true);
    });
  });
  
  // Test charity/charities synonym
  describe('Charity/Charities Synonym', () => {
    it('should expand "charity" to include "charities"', () => {
      const expanded = expandCategoryKeyword('charity');
      expect(expanded).toContain('charity');
      expect(expanded).toContain('charities');
    });
    
    it('should expand "charities" to include "charity"', () => {
      const expanded = expandCategoryKeyword('charities');
      expect(expanded).toContain('charities');
      expect(expanded).toContain('charity');
    });
    
    it('should match "charity" with "Charities" category', () => {
      const matches = fuzzyMatchCategory('charity', 'Charities');
      expect(matches).toBe(true);
    });
    
    it('should match "charities" with "Charities" category', () => {
      const matches = fuzzyMatchCategory('charities', 'Charities');
      expect(matches).toBe(true);
    });
    
    it('should NOT match "charity" with "Food & Beverage" category', () => {
      const matches = fuzzyMatchCategory('charity', 'Food & Beverage');
      expect(matches).toBe(false);
    });
  });
  
  // Integration test for full query parsing
  describe('Full Query Processing', () => {
    const prepositions = ['at', 'in', 'on', 'for', 'near', 'by', 'from', 'to', 'the', 'a', 'an'];
    
    function processQuery(query: string, categoryKeyword: string, centreName: string): boolean {
      const lowerQuery = query.toLowerCase();
      
      // Filter out category and prepositions
      const queryWordsWithoutCategory = lowerQuery.split(/\s+/).filter(word => 
        word !== categoryKeyword.toLowerCase() && 
        !expandCategoryKeyword(categoryKeyword).includes(word) &&
        !prepositions.includes(word)
      );
      
      // If no other query words, return true
      if (queryWordsWithoutCategory.length === 0) {
        return true;
      }
      
      // Check if all remaining words appear in centre name
      return queryWordsWithoutCategory.every(word => centreName.toLowerCase().includes(word));
    }
    
    it('should match "charity at bondi" with "eastgate bondi junction"', () => {
      expect(processQuery('charity at bondi', 'charity', 'eastgate bondi junction')).toBe(true);
    });
    
    it('should match "charity bondi" with "eastgate bondi junction"', () => {
      expect(processQuery('charity bondi', 'charity', 'eastgate bondi junction')).toBe(true);
    });
    
    it('should match "fashion in pacific" with "pacific square maroubra"', () => {
      expect(processQuery('fashion in pacific', 'fashion', 'pacific square maroubra')).toBe(true);
    });
    
    it('should NOT match "charity at sydney" with "eastgate bondi junction"', () => {
      expect(processQuery('charity at sydney', 'charity', 'eastgate bondi junction')).toBe(false);
    });
    
    it('should match just "charity" (no location) with any centre', () => {
      expect(processQuery('charity', 'charity', 'eastgate bondi junction')).toBe(true);
      expect(processQuery('charity', 'charity', 'pacific square maroubra')).toBe(true);
    });
  });
});
