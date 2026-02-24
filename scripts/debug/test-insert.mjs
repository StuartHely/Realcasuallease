import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { customerProfiles } from "./drizzle/schema.js";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(conn);
  
  // Test the insert without id
  const testProfile = {
    userId: 30001,
    firstName: "Test",
    lastName: "User",
    phone: "0400111222",
    companyName: "Test Co",
    website: null,
    abn: "12345678901",
    streetAddress: "123 Test St",
    city: "Sydney",
    state: "NSW",
    postcode: "2000",
    productCategory: "Fashion",
    insuranceCompany: null,
    insurancePolicyNo: null,
    insuranceAmount: null,
    insuranceExpiry: null,
    insuranceDocumentUrl: null,
  };
  
  // Generate the SQL
  const query = db.insert(customerProfiles).values(testProfile);
  console.log("SQL:", query.toSQL());
  
  await conn.end();
}
main().catch(console.error);
