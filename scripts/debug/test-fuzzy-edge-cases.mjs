import { searchShoppingCentres } from './server/db.js';

async function testFuzzyEdgeCases() {
  console.log('Testing fuzzy search edge cases:\n');
  
  const testCases = [
    // Good matches
    { query: 'high', expected: 'Highlands Marketplace', shouldMatch: true },
    { query: 'market', expected: 'Highlands Marketplace', shouldMatch: true },
    { query: 'camp', expected: 'Campbelltown Mall', shouldMatch: true },
    { query: 'bell', expected: 'Campbelltown Mall', shouldMatch: true },
    { query: 'pacific', expected: 'Pacific Square', shouldMatch: true },
    { query: 'pacfic', expected: 'Pacific Square', shouldMatch: true }, // typo
    { query: 'rockdale', expected: 'Rockdale Plaza', shouldMatch: true },
    { query: 'rocdale', expected: 'Rockdale Plaza', shouldMatch: true }, // typo
    
    // Should NOT match (too different)
    { query: 'xyz', expected: 'none', shouldMatch: false },
    { query: 'test', expected: 'none', shouldMatch: false },
    { query: 'abc', expected: 'none', shouldMatch: false },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    try {
      const results = await searchShoppingCentres(test.query);
      const found = results.length > 0;
      
      if (test.shouldMatch) {
        if (found) {
          const matchesExpected = results.some(r => r.name.includes(test.expected.split(' ')[0]));
          if (matchesExpected) {
            console.log(`✅ "${test.query}" → found ${test.expected}`);
            passed++;
          } else {
            console.log(`❌ "${test.query}" → found ${results[0].name}, expected ${test.expected}`);
            failed++;
          }
        } else {
          console.log(`❌ "${test.query}" → no results, expected ${test.expected}`);
          failed++;
        }
      } else {
        if (!found) {
          console.log(`✅ "${test.query}" → correctly returned no results`);
          passed++;
        } else {
          console.log(`❌ "${test.query}" → found ${results[0].name}, should have no results`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`❌ "${test.query}" → ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n---\nResults: ${passed} passed, ${failed} failed`);
}

testFuzzyEdgeCases().catch(console.error);
