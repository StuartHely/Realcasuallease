import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, centreId, levelName, mapImageUrl FROM floor_levels WHERE centreId = 60004');
console.log(JSON.stringify(rows, null, 2));
await conn.end();
