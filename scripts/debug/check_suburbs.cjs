const { Client } = require('pg');
async function main() {
  const client = new Client('postgresql://postgres:password@localhost:5432/casuallease');
  await client.connect();
  // List all distinct suburbs with centre count
  const res = await client.query(`
    SELECT suburb, COUNT(*) as centre_count, array_agg(name) as centres
    FROM shopping_centres
    WHERE "includeInMainSite" = true AND suburb IS NOT NULL
    GROUP BY suburb
    ORDER BY suburb
  `);
  console.log('=== All suburbs with centres ===');
  res.rows.forEach(r => console.log(`${r.suburb}: ${r.centre_count} centre(s) -> ${r.centres.join(', ')}`));
  await client.end();
}
main().catch(console.error);
