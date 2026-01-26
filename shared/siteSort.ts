/**
 * Natural/alphanumeric sorting for site numbers
 * Sorts: 1, 2, 3, ... 10, 11, 12, ... 9a, VK13
 * Pure numbers come before alphanumeric
 */
export function naturalSiteSort<T extends { siteNumber: string }>(sites: T[]): T[] {
  return [...sites].sort((a, b) => {
    const aNum = parseInt(a.siteNumber.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.siteNumber.replace(/\D/g, '')) || 0;
    const aHasLetter = /[a-zA-Z]/.test(a.siteNumber);
    const bHasLetter = /[a-zA-Z]/.test(b.siteNumber);
    // Pure numbers come before alphanumeric
    if (!aHasLetter && bHasLetter) return -1;
    if (aHasLetter && !bHasLetter) return 1;
    // Compare by extracted number first
    if (aNum !== bNum) return aNum - bNum;
    // If same number, compare full string
    return a.siteNumber.localeCompare(b.siteNumber);
  });
}

/**
 * Compare function for natural site number sorting
 * Can be used directly with Array.sort()
 */
export function compareSiteNumbers(a: string, b: string): number {
  const aNum = parseInt(a.replace(/\D/g, '')) || 0;
  const bNum = parseInt(b.replace(/\D/g, '')) || 0;
  const aHasLetter = /[a-zA-Z]/.test(a);
  const bHasLetter = /[a-zA-Z]/.test(b);
  // Pure numbers come before alphanumeric
  if (!aHasLetter && bHasLetter) return -1;
  if (aHasLetter && !bHasLetter) return 1;
  // Compare by extracted number first
  if (aNum !== bNum) return aNum - bNum;
  // If same number, compare full string
  return a.localeCompare(b);
}
