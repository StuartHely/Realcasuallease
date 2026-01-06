import { getDb } from "./server/db.js";
import { getApprovedCategoriesForSite, isCategoryApprovedForSite } from "./server/usageCategoriesDb.js";

const testSiteId = 150001; // From test
const testCategoryId = 1; // Any category

console.log("Testing default approval logic...\n");

const approvedCategories = await getApprovedCategoriesForSite(testSiteId);
console.log(`Approved categories for site ${testSiteId}:`, approvedCategories);
console.log(`Length: ${approvedCategories.length}`);

const isApproved = await isCategoryApprovedForSite(testSiteId, testCategoryId);
console.log(`\nIs category ${testCategoryId} approved for site ${testSiteId}?`, isApproved);

// Test the logic
const shouldAutoApprove = approvedCategories.length === 0 || isApproved;
console.log(`\nShould auto-approve? ${shouldAutoApprove}`);
console.log(`Logic: approvedCategories.length === 0 (${approvedCategories.length === 0}) || isApproved (${isApproved})`);

process.exit(0);
