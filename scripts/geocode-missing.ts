import pg from "pg";
const { Pool } = pg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/casuallease" });

  const missing = await pool.query("SELECT id, name, address, suburb, state, postcode FROM shopping_centres WHERE latitude IS NULL OR longitude IS NULL");
  console.log("Centres missing coords:", missing.rows.map((r: any) => r.name));

  for (const centre of missing.rows) {
    const queries = [
      [centre.name, centre.address, centre.suburb, centre.state, centre.postcode].filter(Boolean).join(", "),
      [centre.name, centre.suburb, centre.state].filter(Boolean).join(", "),
      [centre.suburb, centre.state, "Australia"].filter(Boolean).join(", "),
    ];

    let found = false;
    for (const q of queries) {
      if (!q.trim()) continue;
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "au");

      const res = await fetch(url.toString(), { headers: { "User-Agent": "CasualLease/1.0" } });
      const data = await res.json() as Array<{ lat: string; lon: string }>;
      if (data.length > 0) {
        await pool.query("UPDATE shopping_centres SET latitude = $1, longitude = $2 WHERE id = $3", [data[0].lat, data[0].lon, centre.id]);
        console.log(`${centre.name} -> ${data[0].lat}, ${data[0].lon}`);
        found = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1100));
    }
    if (!found) console.log(`${centre.name} -> NOT FOUND`);
    await new Promise(r => setTimeout(r, 1100));
  }

  const verify = await pool.query("SELECT id, name, latitude, longitude FROM shopping_centres ORDER BY id");
  console.log("\nAll centres:");
  for (const r of verify.rows) {
    console.log(`  ${r.id} | ${r.name} | ${r.latitude}, ${r.longitude}`);
  }
  pool.end();
}

run().catch(console.error);
