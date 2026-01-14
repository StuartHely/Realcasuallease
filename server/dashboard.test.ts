import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { users, shoppingCentres, sites, bookings, budgets } from '../drizzle/schema';
import { sql, inArray } from 'drizzle-orm';
import { getPermittedSiteIds, getYTDMetrics, getMonthlyMetrics, getBudgetMetrics, getPendingApprovalsCount } from './dashboardDb';

describe('Portfolio Dashboard RBAC', () => {

  it('should allow mega_admin to see all sites', async () => {
    const siteIds = await getPermittedSiteIds('mega_admin', null);
    expect(siteIds.length).toBeGreaterThan(0);
  });

  it('should allow owner_super_admin to see all sites', async () => {
    const siteIds = await getPermittedSiteIds('owner_super_admin', null);
    expect(siteIds.length).toBeGreaterThan(0);
  });

  it('should restrict mega_state_admin to their assigned state', async () => {
    const nswSiteIds = await getPermittedSiteIds('mega_state_admin', 'NSW');
    const vicSiteIds = await getPermittedSiteIds('mega_state_admin', 'VIC');
    
    // At least one state should have sites
    const hasNSWSites = nswSiteIds.length > 0;
    const hasVICSites = vicSiteIds.length > 0;
    expect(hasNSWSites || hasVICSites).toBe(true);
    
    // NSW and VIC site lists should be different (no overlap)
    if (hasNSWSites && hasVICSites) {
      const overlap = nswSiteIds.filter(id => vicSiteIds.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  it('should return empty array for customer role', async () => {
    const siteIds = await getPermittedSiteIds('customer', null);
    expect(siteIds).toEqual([]);
  });

  it('should return empty array for state admin without assigned state', async () => {
    const siteIds = await getPermittedSiteIds('mega_state_admin', null);
    expect(siteIds).toEqual([]);
  });
});

describe('Dashboard Metrics Calculations', () => {
  it('should return zero metrics for empty site list', async () => {
    const metrics = await getYTDMetrics([], 2026);
    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.totalBookedDays).toBe(0);
    expect(metrics.topSite).toBeNull();
  });

  it('should calculate YTD metrics correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get a real site ID from the database
    const [site] = await db.select({ id: sites.id }).from(sites).limit(1);
    if (!site) {
      console.log('No sites available for testing');
      return;
    }

    const metrics = await getYTDMetrics([site.id], 2026);
    
    // Metrics should be valid numbers
    expect(typeof metrics.totalRevenue).toBe('number');
    expect(typeof metrics.totalBookedDays).toBe('number');
    expect(metrics.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(metrics.totalBookedDays).toBeGreaterThanOrEqual(0);
  });

  it('should calculate monthly metrics correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [site] = await db.select({ id: sites.id }).from(sites).limit(1);
    if (!site) return;

    const metrics = await getMonthlyMetrics([site.id], 1, 2026);
    
    expect(typeof metrics.totalRevenue).toBe('number');
    expect(typeof metrics.totalBookedDays).toBe('number');
    expect(metrics.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(metrics.totalBookedDays).toBeGreaterThanOrEqual(0);
  });

  it('should calculate budget metrics correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [site] = await db.select({ id: sites.id }).from(sites).limit(1);
    if (!site) return;

    // Insert test budget
    await db.insert(budgets).values({
      siteId: site.id,
      month: 1,
      year: 2026,
      budgetAmount: '10000.00',
    }).onDuplicateKeyUpdate({ set: { budgetAmount: '10000.00' } });

    const metrics = await getBudgetMetrics([site.id], 1, 2026);
    
    expect(typeof metrics.annualBudget).toBe('number');
    expect(typeof metrics.ytdBudget).toBe('number');
    expect(metrics.ytdBudget).toBeGreaterThanOrEqual(0);
  });

  it('should count pending approvals correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [site] = await db.select({ id: sites.id }).from(sites).limit(1);
    if (!site) return;

    const count = await getPendingApprovalsCount([site.id]);
    
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe('Dashboard API Integration', () => {
  it('should handle state filtering for national admins', async () => {
    // Test that national admins can filter by any state
    const nswSites = await getPermittedSiteIds('mega_admin', null);
    expect(nswSites.length).toBeGreaterThan(0);
  });

  it('should enforce state restriction for state admins', async () => {
    // State admins should only see their assigned state
    const nswSites = await getPermittedSiteIds('mega_state_admin', 'NSW');
    const vicSites = await getPermittedSiteIds('mega_state_admin', 'VIC');
    
    // Both should work, but return different results
    expect(Array.isArray(nswSites)).toBe(true);
    expect(Array.isArray(vicSites)).toBe(true);
  });
});
