import "dotenv/config";
import pg from "pg";
import fs from "fs/promises";

const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();

try {
  // Get all table names
  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);

  let dump = `-- CasualLease Database Dump\n-- Generated: ${new Date().toISOString()}\n\n`;

  for (const { tablename } of tables) {
    // Get column info
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tablename]);

    const colNames = columns.map(c => `"${c.column_name}"`).join(", ");

    // Get all rows
    const { rows } = await client.query(`SELECT * FROM "${tablename}"`);
    
    if (rows.length > 0) {
      dump += `-- Table: ${tablename} (${rows.length} rows)\n`;
      dump += `DELETE FROM "${tablename}" CASCADE;\n`;
      
      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col.column_name];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          if (typeof val === "number") return String(val);
          if (val instanceof Date) return `'${val.toISOString()}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(", ");
        dump += `INSERT INTO "${tablename}" (${colNames}) VALUES (${values});\n`;
      }
      dump += "\n";
    }
  }

  const outPath = "Test/Data1/casuallease_backup_current.sql";
  await fs.writeFile(outPath, dump);
  console.log(`Done: ${outPath} (${(dump.length / 1024).toFixed(0)} KB, ${tables.length} tables)`);
} catch (e: any) {
  console.error("Error:", e.message);
} finally {
  await client.end();
}
