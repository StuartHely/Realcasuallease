import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites } from "../drizzle/schema";

async function testMetrics() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const { getYTDMetrics, getMonthlyMetrics } = await import('../server/dashboardDb');
  
  const allSites = await db.select({ id: sites.id }).from(sites);
  const siteIds = allSites.map(s => s.id);
  
  console.log('Testing with', siteIds.length, 'site IDs');
  console.log('\nCalling getYTDMetrics for year 2026...');
  
  const ytdMetrics = await getYTDMetrics(siteIds, 2026);
  console.log('YTD Metrics:', ytdMetrics);
  
  console.log('\nCalling getMonthlyMetrics for Feb 2026...');
  const monthMetrics = await getMonthlyMetrics(siteIds, 2, 2026);
  console.log('Monthly Metrics:', monthMetrics);
  
  await pool.end();
}

testMetrics().catch(console.error);