const http = require('http');

// Test several suburb-based searches
const queries = [
  "tables near Kogarah",
  "near Campbelltown",
  "sell near Bondi Junction",
  "sell socks near Maroubra",
  "near Kallangur",
];

async function testQuery(query) {
  return new Promise((resolve) => {
    const now = new Date();
    const input = JSON.stringify({
      "0": {
        json: { query, date: now.toISOString() },
        meta: { values: { date: ["Date"] } }
      }
    });
    const url = `http://localhost:3000/api/trpc/search.smart?batch=1&input=${encodeURIComponent(input)}`;
    
    http.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const result = parsed?.[0]?.result?.data?.json || parsed?.[0]?.result?.data;
          const centres = result?.centres?.map(c => c.name) || [];
          resolve({ query, centres, siteCount: result?.sites?.length || 0 });
        } catch (e) {
          resolve({ query, error: e.message });
        }
      });
    }).on('error', e => resolve({ query, error: e.message }));
  });
}

(async () => {
  // Run sequentially to avoid cache interference
  for (const q of queries) {
    const result = await testQuery(q);
    console.log(`"${result.query}" => ${result.centres?.join(', ') || 'NONE'} (${result.siteCount} sites)`);
  }
})();
