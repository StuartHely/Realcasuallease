import * as db from './server/db.ts';

// Image dimensions: 646 x 382
// Based on the floor plan layout:
// Site 1: In front of Woolworths (top left area) - near store 42
// Site 2: In front of CTC (center area)
// Site 3: In front of Just Cuts and Amenity Corridor (center)
// Site 4: Opposite Specsavers (center-right area)
// Site 5: Opposite Prouds (center-right area)
// Site 6: In front of Spendless Shoes (center area)
// Site 7: Opposite Eyesence Optometrist, next to Lab Kitchen (center area)

const markers = [
  { siteId: 60036, x: 220, y: 110 },  // Site 1: Near Woolworths (top center-left)
  { siteId: 60037, x: 190, y: 200 },  // Site 2: In front of CTC (left center)
  { siteId: 60038, x: 250, y: 200 },  // Site 3: Just Cuts area (center)
  { siteId: 60039, x: 310, y: 200 },  // Site 4: Opposite Specsavers (center)
  { siteId: 60040, x: 370, y: 200 },  // Site 5: Opposite Prouds (center-right)
  { siteId: 60041, x: 430, y: 200 },  // Site 6: Spendless Shoes (right center)
  { siteId: 60042, x: 490, y: 200 },  // Site 7: Eyesence area (right)
];

const result = await db.saveSiteMarkers(markers);
console.log('✓ Site markers saved successfully!');
console.log(`Saved ${result.count} markers`);
