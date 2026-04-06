const { Client } = require('pg');
const c = new Client('postgresql://postgres:password@localhost:5432/casuallease');
c.connect().then(async () => {
  const r = await c.query(`
    SELECT s.id, s."siteNumber", s."centreId", s."maxTables", sc.name as centre_name
    FROM sites s
    JOIN shopping_centres sc ON sc.id = s."centreId"
    WHERE sc.name IN ('Ocean Square', 'Pacific Square')
    ORDER BY sc.name, s."siteNumber"
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
