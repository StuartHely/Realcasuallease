import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { shoppingCentres } from './drizzle/schema.ts';
import { like } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await db.select().from(shoppingCentres).where(like(shoppingCentres.name, '%Highlands%'));
console.log(JSON.stringify(result, null, 2));
await connection.end();
