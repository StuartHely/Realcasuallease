const { Client } = require('pg');
const c = new Client('postgresql://postgres:password@localhost:5432/casuallease');
c.connect().then(async () => {
  const r = await c.query(`SELECT id, name, suburb, city, state FROM shopping_centres WHERE name ILIKE '%ocean%' OR name ILIKE '%pacific%'`);
  console.log(JSON.stringify(r.rows, null, 2));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
