import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { centreBudgets, shoppingCentres } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkAllBudgets() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  const budgets = await db
    .select({
      budget: centreBudgets,
      centre: shoppingCentres,
    })
    .from(centreBudgets)
    .leftJoin(shoppingCentres, eq(centreBudgets.centreId, shoppingCentres.id));
  
  console.log('All budgets:');
  budgets.forEach(b => {
    console.log(`- ${b.centre?.name || 'Unknown'} (Centre ID: ${b.budget.centreId}): FY ${b.budget.financialYear}, $${b.budget.annualBudget}`);
  });
  
  await pool.end();
}

checkAllBudgets().catch(console.error);