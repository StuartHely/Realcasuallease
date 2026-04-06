const http = require('http');

const query = "sell socks with 3 tables near Maroubra";
const date = new Date().toISOString();

const input = encodeURIComponent(JSON.stringify({ "0": { json: { query, date } } }));
const url = `http://localhost:3000/api/trpc/search.smart?batch=1&input=${input}`;

http.get(url, { timeout: 15000 }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    // Print first 3000 chars of raw response 
    console.log('Raw:', data.substring(0, 3000));
    try {
      const parsed = JSON.parse(data);
      // Dig into tRPC response structure
      const result = parsed?.[0]?.result?.data;
      if (result) {
        const r = result.json || result;
        console.log('\n=== Parsed ===');
        console.log('Centres:', JSON.stringify(r.centres?.map(c => ({ id: c.id, name: c.name })), null, 2));
        console.log('Sites count:', r.sites?.length);
        if (r.sites?.length > 0) {
          console.log('Sites:', JSON.stringify(r.sites.map(s => ({ id: s.id, siteNumber: s.siteNumber, centreName: s.centreName, centreId: s.centreId })), null, 2));
        }
        console.log('categoryFallbackUsed:', r.categoryFallbackUsed);
        console.log('searchInterpretation:', JSON.stringify(r.searchInterpretation, null, 2));
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
}).on('error', e => console.error('Error:', e.message));
