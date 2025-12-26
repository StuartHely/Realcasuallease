import { searchShoppingCentres } from './server/db.js';

async function testSearch() {
  console.log('Testing search API...\n');

  const queries = [
    'Highlands Marketplace',
    'Highlands',
    'highlands',
    'HIGHLANDS',
    'High',
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    try {
      const results = await searchShoppingCentres(query);
      console.log(`  Results: ${results.length}`);
      results.forEach(r => console.log(`    - ${r.name} (ID: ${r.id})`));
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
    console.log('');
  }
}

testSearch().catch(console.error);
