import * as db from './server/db.ts';

const sites = await db.searchSites('Pacific Square');
console.log('Pacific Square sites:');
sites.forEach(({site}) => {
  console.log(`  Site ${site.siteNumber}: ${site.description}`);
});

process.exit(0);
