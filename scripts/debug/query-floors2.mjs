import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { floorLevels } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const floors = await db.select().from(floorLevels).where(eq(floorLevels.centreId, 60005));
console.log(JSON.stringify(floors, null, 2));
await connection.end();
process.exit(0);
