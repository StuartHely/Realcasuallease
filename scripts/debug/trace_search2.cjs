const http = require('http');

const query = "sell socks with 3 tables near Maroubra";
const now = new Date();
// SuperJSON date encoding
const input = JSON.stringify({
  "0": {
    json: { query, date: now.toISOString() },
    meta: { values: { date: ["Date"] } }
  }
});

const url = `http://localhost:3000/api/trpc/search.smart?batch=1&input=${encodeURIComponent(input)}`;

http.get(url, { timeout: 30000 }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      if (parsed?.[0]?.error) {
        console.log('Error:', JSON.stringify(parsed[0].error, null, 2).substring(0, 500));
        return;
      }
      const result = parsed?.[0]?.result?.data?.json || parsed?.[0]?.result?.data;
      if (result) {
        console.log('Centres:', JSON.stringify(result.centres?.map(c => ({ id: c.id, name: c.name })), null, 2));
        console.log('Sites count:', result.sites?.length);
        if (result.sites) {
          console.log('Sites:', JSON.stringify(result.sites.map(s => ({
            id: s.id, siteNumber: s.siteNumber,
            centreName: s.centreName, centreId: s.centreId
          })), null, 2));
        }
        console.log('categoryFallbackUsed:', result.categoryFallbackUsed);
        console.log('interpretation:', JSON.stringify(result.searchInterpretation, null, 2));
      } else {
        console.log('No result found in response. Keys:', Object.keys(parsed?.[0]?.result || {}));
        console.log('Raw (first 1000):', data.substring(0, 1000));
      }
    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('Raw (first 1000):', data.substring(0, 1000));
    }
  });
}).on('error', e => console.error('Request error:', e.message));
