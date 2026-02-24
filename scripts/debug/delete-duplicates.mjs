import { drizzle } from 'drizzle-orm/mysql2';
import { shoppingCentres } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function deleteDuplicates() {
  console.log('Deleting duplicate centres...\n');
  
  // Delete Centre ID 3 (duplicate Highlands Marketplace with no bookings/images)
  console.log('Deleting Centre ID 3 (duplicate Highlands Marketplace)...');
  await db.delete(shoppingCentres).where(eq(shoppingCentres.id, 3));
  console.log('✅ Deleted Centre 3');
  
  // Delete Centre ID 4 (duplicate Campbelltown Mall)
  console.log('\nDeleting Centre ID 4 (duplicate Campbelltown Mall)...');
  await db.delete(shoppingCentres).where(eq(shoppingCentres.id, 4));
  console.log('✅ Deleted Centre 4');
  
  console.log('\n✅ All duplicates removed!');
}

deleteDuplicates().catch(console.error);
