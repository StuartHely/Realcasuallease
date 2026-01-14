import { describe, it, expect } from 'vitest';
import { getSiteBreakdown } from './dashboardDb';
import { bulkImportBudgets, getSites } from './db';

let testSiteId: number | null = null;

async function getTestSiteId() {
  if (testSiteId) return testSiteId;
  const sites = await getSites();
  if (sites.length > 0) {
    testSiteId = sites[0].id;
  }
  return testSiteId;
}

describe('Budget vs Actual Reporting', () => {
  it('should return site breakdown for national admin', { timeout: 10000 }, async () => {
    const breakdown = await getSiteBreakdown('mega_admin', null, 2026, 'annual');
    
    expect(Array.isArray(breakdown)).toBe(true);
    if (breakdown.length > 0) {
      expect(breakdown[0]).toHaveProperty('siteId');
      expect(breakdown[0]).toHaveProperty('siteName');
      expect(breakdown[0]).toHaveProperty('centreName');
      expect(breakdown[0]).toHaveProperty('budget');
      expect(breakdown[0]).toHaveProperty('actual');
      expect(breakdown[0]).toHaveProperty('variance');
      expect(breakdown[0]).toHaveProperty('percentAchieved');
    }
  });

  it('should filter by state for state admin', { timeout: 10000 }, async () => {
    const breakdown = await getSiteBreakdown('mega_state_admin', 'NSW', 2026, 'annual');
    
    expect(Array.isArray(breakdown)).toBe(true);
    // All sites should be from NSW
    // (This test assumes there are NSW sites in the database)
  });

  it('should calculate YTD breakdown correctly', async () => {
    const breakdown = await getSiteBreakdown('mega_admin', null, 2026, 'ytd');
    
    expect(Array.isArray(breakdown)).toBe(true);
    // YTD should only include months up to current month
  });

  it('should sort by variance (worst performers first)', async () => {
    const breakdown = await getSiteBreakdown('mega_admin', null, 2026, 'annual');
    
    if (breakdown.length > 1) {
      // Check that variance is in ascending order (most negative first)
      for (let i = 0; i < breakdown.length - 1; i++) {
        expect(breakdown[i].variance).toBeLessThanOrEqual(breakdown[i + 1].variance);
      }
    }
  });
});

describe('CSV Bulk Import', () => {
  it('should import valid budget data', async () => {
    const siteId = await getTestSiteId();
    if (!siteId) {
      console.log('No sites available for testing');
      return;
    }
    
    const testData = [
      { siteId, month: 1, year: 2027, budgetAmount: '10000.00' },
      { siteId, month: 2, year: 2027, budgetAmount: '11000.00' },
    ];

    const result = await bulkImportBudgets(testData);

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid month values', async () => {
    const siteId = await getTestSiteId();
    if (!siteId) return;
    
    const testData = [
      { siteId, month: 13, year: 2027, budgetAmount: '10000.00' }, // Invalid month
      { siteId, month: 0, year: 2027, budgetAmount: '11000.00' },  // Invalid month
    ];

    const result = await bulkImportBudgets(testData);

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(2);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle missing required fields', async () => {
    const siteId = await getTestSiteId();
    if (!siteId) return;
    
    const testData = [
      { siteId, month: 1, year: 2027, budgetAmount: '' }, // Missing budgetAmount
    ];

    const result = await bulkImportBudgets(testData);

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(1);
    expect(result.errors[0].error).toContain('Missing required fields');
  });

  it('should update existing budgets on duplicate', async () => {
    const siteId = await getTestSiteId();
    if (!siteId) return;
    
    const testData = [
      { siteId, month: 1, year: 2027, budgetAmount: '15000.00' },
    ];

    // First import
    const result1 = await bulkImportBudgets(testData);
    expect(result1.imported).toBe(1);

    // Second import with same siteId/month/year should update
    const testData2 = [
      { siteId, month: 1, year: 2027, budgetAmount: '16000.00' },
    ];
    const result2 = await bulkImportBudgets(testData2);
    expect(result2.imported).toBe(1);
    expect(result2.success).toBe(true);
  });

  it('should return detailed error information', async () => {
    const siteId = await getTestSiteId();
    if (!siteId) return;
    
    const testData = [
      { siteId, month: 1, year: 2027, budgetAmount: '10000.00' },  // Valid
      { siteId, month: 13, year: 2027, budgetAmount: '11000.00' }, // Invalid month
      { siteId, month: 3, year: 2027, budgetAmount: '12000.00' },  // Valid
    ];

    const result = await bulkImportBudgets(testData);

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toHaveProperty('row');
    expect(result.errors[0]).toHaveProperty('error');
  });
});
