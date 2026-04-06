const { Client } = require('pg');
const c = new Client('postgresql://postgres:password@localhost:5432/casuallease');
c.connect().then(async () => {
  const r = await c.query(`
    SELECT sc.id, sc.name, sc."includeInMainSite", s.id as site_id, s."siteNumber", uc.name as category
    FROM shopping_centres sc
    JOIN sites s ON s."centreId" = sc.id
    JOIN site_usage_categories suc ON suc."siteId" = s.id
    JOIN usage_categories uc ON uc.id = suc."categoryId"
    WHERE LOWER(uc.name) LIKE '%sock%'
    ORDER BY sc.name, s."siteNumber"
  `);
  console.log('Sites with socks category:');
  console.log(JSON.stringify(r.rows, null, 2));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
