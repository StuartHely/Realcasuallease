import fs from 'fs';
import * as db from './server/db.ts';

const base64Data = fs.readFileSync('/tmp/carnes-hill-map-base64.txt', 'utf8');
const result = await db.uploadCentreMap(60005, base64Data, 'CarnesHillMarketplaceBlankCasualLeasingCentreMap.png');
console.log('✓ Floor plan uploaded successfully!');
console.log('Map URL:', result.mapUrl);
