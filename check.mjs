import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sites } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);
const result = await db.select({s: sites.siteNumber, x: sites.mapMarkerX, y: sites.mapMarkerY}).from(sites).where(eq(sites.centreId, 60003));
result.sort((a,b) => parseInt(a.s) - parseInt(b.s));
result.forEach(r => console.log(`Site ${r.s}: X=${r.x}, Y=${r.y}`));
await conn.end();
