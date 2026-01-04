import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const floors = await db.select().from(schema.floorLevels).where(schema.eq(schema.floorLevels.centreId, 60002));
console.log(JSON.stringify(floors, null, 2));
await connection.end();
process.exit(0);
