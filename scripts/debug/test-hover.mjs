// Quick test to verify site data has the right fields
import * as db from './server/db.ts';

const sites = await db.getSitesByCentreId(60005);
console.log('Site 1 data:', {
  id: sites[0].id,
  siteNumber: sites[0].siteNumber,
  description: sites[0].description,
  pricePerDay: sites[0].dailyRate,
  pricePerWeek: sites[0].weeklyRate,
  imageUrl1: sites[0].imageUrl1,
  mapMarkerX: sites[0].mapMarkerX,
  mapMarkerY: sites[0].mapMarkerY,
});
