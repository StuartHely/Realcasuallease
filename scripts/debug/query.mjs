import { db } from "./server/db.js";
const sites = await db.getSitesByCentre(60002);
console.log(JSON.stringify(sites.map(s => ({
  id: s.id,
  siteNumber: s.siteNumber,
  mapMarkerX: s.mapMarkerX,
  mapMarkerY: s.mapMarkerY
})), null, 2));
process.exit(0);
