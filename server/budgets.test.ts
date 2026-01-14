import { describe, it, expect, beforeAll } from 'vitest';
import { createBudget, getAllBudgets, updateBudget, deleteBudget, getBudgetsBySite } from './db';
import { getDb } from './db';
import { budgets, sites } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Budget Management', () => {
  let testSiteId: number;
  let testBudgetId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get first site ID for testing
    const sitesList = await db.select({ id: sites.id }).from(sites).limit(1);
    if (sitesList.length === 0) throw new Error('No sites available for testing');
    testSiteId = sitesList[0].id;
  });

  it('should create a new budget', async () => {
    const result = await createBudget({
      siteId: testSiteId,
      month: 1,
      year: 2027,
      budgetAmount: '15000.00',
    });

    expect(result.success).toBe(true);

    // Verify budget was created
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const created = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.siteId, testSiteId),
          eq(budgets.month, 1),
          eq(budgets.year, 2027)
        )
      )
      .limit(1);

    expect(created.length).toBe(1);
    expect(created[0].budgetAmount).toBe('15000.00');
    testBudgetId = created[0].id;
  });

  it('should not allow duplicate budgets for same site/month/year', async () => {
    await expect(
      createBudget({
        siteId: testSiteId,
        month: 1,
        year: 2027,
        budgetAmount: '20000.00',
      })
    ).rejects.toThrow('Budget already exists');
  });

  it('should retrieve all budgets', async () => {
    const allBudgets = await getAllBudgets();
    expect(Array.isArray(allBudgets)).toBe(true);
    expect(allBudgets.length).toBeGreaterThan(0);
    
    // Check structure
    const budget = allBudgets[0];
    expect(budget).toHaveProperty('id');
    expect(budget).toHaveProperty('siteId');
    expect(budget).toHaveProperty('siteName');
    expect(budget).toHaveProperty('centreName');
    expect(budget).toHaveProperty('month');
    expect(budget).toHaveProperty('year');
    expect(budget).toHaveProperty('budgetAmount');
  });

  it('should retrieve budgets by site and year', async () => {
    const siteBudgets = await getBudgetsBySite(testSiteId, 2027);
    expect(Array.isArray(siteBudgets)).toBe(true);
    expect(siteBudgets.length).toBeGreaterThan(0);
    expect(siteBudgets[0].siteId).toBe(testSiteId);
    expect(siteBudgets[0].year).toBe(2027);
  });

  it('should update a budget amount', async () => {
    const result = await updateBudget(testBudgetId, '18000.00');
    expect(result.success).toBe(true);

    // Verify update
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const updated = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, testBudgetId))
      .limit(1);

    expect(updated[0].budgetAmount).toBe('18000.00');
  });

  it('should delete a budget', async () => {
    const result = await deleteBudget(testBudgetId);
    expect(result.success).toBe(true);

    // Verify deletion
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const deleted = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, testBudgetId))
      .limit(1);

    expect(deleted.length).toBe(0);
  });

  it('should return empty array for site with no budgets', async () => {
    const siteBudgets = await getBudgetsBySite(testSiteId, 2099);
    expect(Array.isArray(siteBudgets)).toBe(true);
    expect(siteBudgets.length).toBe(0);
  });
});
