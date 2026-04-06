import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { shoppingCentres } from "../../drizzle/schema";

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  const centres = await db.select({
    id: shoppingCentres.id,
    name: shoppingCentres.name,
    lat: shoppingCentres.latitude,
    lng: shoppingCentres.longitude,
    state: shoppingCentres.state,
  }).from(shoppingCentres);

  console.log("Total centres:", centres.length);
  console.log("\nCentres with coordinates:");
  const withCoords = centres.filter(c => c.lat && c.lng);
  withCoords.forEach(c => console.log(`  ${c.id}: ${c.name} (${c.state}) - ${c.lat}, ${c.lng}`));
  
  console.log("\nCentres WITHOUT coordinates:");
  const noCoords = centres.filter(c => !c.lat || !c.lng);
  noCoords.forEach(c => console.log(`  ${c.id}: ${c.name} (${c.state})`));

  process.exit(0);
}
main().catch(console.error);
