import { parseSearchQuery } from './shared/queryParser.ts';

const query = "Highlands 2x3 books";
const parsed = parseSearchQuery(query);

console.log('Input query:', query);
console.log('Parsed result:', JSON.stringify(parsed, null, 2));
console.log('Centre name:', parsed.centreName);
console.log('Product category:', parsed.productCategory);
console.log('Min size m2:', parsed.minSizeM2);
