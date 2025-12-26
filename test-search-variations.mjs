import { searchShoppingCentres } from './server/db.js';

async function testSearchVariations() {
  console.log('Testing search variations:\n');
  
  const queries = [
    'highland',      // singular
    'highlands',     // correct
    'highlan',       // missing d
    'highlnd',       // missing a
    'higland',       // missing h
    'campbelltown',  // another centre
    'campbeltown',   // missing l
  ];
  
  for (const q of queries) {
    try {
      const results = await searchShoppingCentres(q);
      console.log(`  "${q}" -> ${results.length} result(s)`);
      if (results.length > 0) {
        results.forEach(r => console.log(`    - ${r.name}`));
      }
    } catch (error) {
      console.log(`  "${q}" -> ERROR: ${error.message}`);
    }
  }
}

testSearchVariations().catch(console.error);
