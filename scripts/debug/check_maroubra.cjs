const { Client } = require('pg');
async function main() {
  const client = new Client('postgresql://postgres:password@localhost:5432/casuallease');
  await client.connect();

  const centres = await client.query(`
    SELECT id, name, suburb, state, "includeInMainSite"
    FROM shopping_centres
    WHERE suburb ILIKE '%maroubra%'
    ORDER BY name
  `);
  console.log('=== Maroubra Centres ===');
  centres.rows.forEach(r => console.log(JSON.stringify(r)));

  const centreIds = centres.rows.map(r => r.id);
  const sites = await client.query(`
    SELECT s.id, s."centreId", s."siteNumber", s."maxTables",
           sc.name as centre_name
    FROM sites s
    JOIN shopping_centres sc ON s."centreId" = sc.id
    WHERE s."centreId" = ANY($1::int[])
    ORDER BY sc.name, s."siteNumber"
  `, [centreIds]);
  console.log('\n=== Sites ===');
  sites.rows.forEach(r => console.log(JSON.stringify(r)));

  const cats = await client.query(`
    SELECT sc.name as centre_name, s.id as site_id, s."siteNumber",
           s."maxTables", uc.name as category_name
    FROM sites s
    JOIN shopping_centres sc ON s."centreId" = sc.id
    JOIN site_usage_categories suc ON suc."siteId" = s.id
    JOIN usage_categories uc ON uc.id = suc."categoryId"
    WHERE s."centreId" = ANY($1::int[])
      AND uc.name ILIKE '%sock%'
    ORDER BY sc.name, s."siteNumber"
  `, [centreIds]);
  console.log('\n=== Socks approvals ===');
  cats.rows.forEach(r => console.log(JSON.stringify(r)));

  await client.end();
}
main().catch(console.error);
