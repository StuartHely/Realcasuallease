import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const [rows] = await connection.execute(
  'SELECT id, bookingNumber, tablesRequested, chairsRequested FROM bookings ORDER BY id DESC LIMIT 1'
);

console.log('Latest booking:', JSON.stringify(rows, null, 2));
await connection.end();
