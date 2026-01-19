import { getDb } from "./db";
import { bookings, sites, shoppingCentres, budgets } from "../drizzle/schema";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";

/**
 * Get permitted site IDs based on user role and assigned state
 * - mega_admin / owner_super_admin: all sites
 * - mega_state_admin / owner_state_admin: sites in assigned state
 * - other admin roles: empty array (no dashboard access)
 */
export async function getPermittedSiteIds(userRole: string, assignedState: string | null): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  // National admins see everything
  if (userRole === 'mega_admin' || userRole === 'owner_super_admin') {
    const allSites = await db.select({ id: sites.id }).from(sites);
    return allSites.map((s: any) => s.id);
  }
  
  // State admins see only their state
  if ((userRole === 'mega_state_admin' || userRole === 'owner_state_admin') && assignedState) {
    const stateCentres = await db
      .select({ id: shoppingCentres.id })
      .from(shoppingCentres)
      .where(eq(shoppingCentres.state, assignedState));
    
    const centreIds = stateCentres.map((c: any) => c.id);
    if (centreIds.length === 0) return [];
    
    const stateSites = await db
      .select({ id: sites.id })
      .from(sites)
      .where(inArray(sites.centreId, centreIds));
    
    return stateSites.map((s: any) => s.id);
  }
  
  // Other roles have no dashboard access
  return [];
}

/**
 * Calculate YTD metrics (July 1 of FY start year to today)
 * Uses Financial Year (July-June) to match budget breakdown
 * @param siteIds - Array of site IDs to calculate metrics for
 * @param year - The calendar year parameter (used for month/year selection, not FY)
 * @param financialYear - Optional: The selected financial year (e.g., 2026 for FY 2025-26)
 */
export async function getYTDMetrics(siteIds: number[], year: number, financialYear?: number) {
  const db = await getDb();
  if (!db || siteIds.length === 0) {
    return {
      totalRevenue: 0,
      totalBookedDays: 0,
      topSite: null,
    };
  }
  
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentCalendarYear = now.getFullYear();
  
  // Determine FY start year based on the selected financial year if provided
  // Otherwise, use the current date to determine which FY we're in
  let fyStartYear: number;
  let fyEndYear: number;
  
  if (financialYear) {
    // Use the explicitly selected financial year
    fyStartYear = financialYear - 1; // FY 2025-26 starts July 2025
    fyEndYear = financialYear;
  } else {
    // Calculate based on current date
    if (currentMonth >= 6) {
      // July-December: we're in FY that ends next year
      fyStartYear = currentCalendarYear;
      fyEndYear = currentCalendarYear + 1;
    } else {
      // January-June: we're in FY that started last year
      fyStartYear = currentCalendarYear - 1;
      fyEndYear = currentCalendarYear;
    }
  }
  
  const startDate = new Date(Date.UTC(fyStartYear, 6, 1)); // July 1 of FY start year (UTC)
  
  // For YTD, end date is either end of today or the end of the FY, whichever is earlier
  const fyEndDate = new Date(Date.UTC(fyEndYear, 5, 30, 23, 59, 59, 999)); // June 30 of FY end year (end of day UTC)
  
  // Use end of today (UTC) to include all bookings that start today
  // Add 1 day to ensure we include bookings that start on the current UTC date
  const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const endDate = endOfTodayUTC < fyEndDate ? endOfTodayUTC : fyEndDate; // Use end of today if within FY, otherwise FY end
  
  console.log('[YTD Debug] FY Start Year:', fyStartYear);
  console.log('[YTD Debug] Start Date:', startDate.toISOString());
  console.log('[YTD Debug] End Date:', endDate.toISOString());
  console.log('[YTD Debug] Site IDs count:', siteIds.length);
  console.log('[YTD Debug] First 5 site IDs:', siteIds.slice(0, 5));
  
  // Get all confirmed bookings in date range
  // Use raw SQL to avoid the siteId mismatch issue between bookings and sites tables
  const ytdBookingsResult = await db.execute(sql`
    SELECT 
      b.siteId,
      b.ownerAmount,
      b.startDate,
      b.endDate,
      s.siteNumber as siteName,
      sc.name as centreName
    FROM bookings b
    LEFT JOIN sites s ON b.siteId = s.id
    LEFT JOIN shopping_centres sc ON s.centreId = sc.id
    WHERE b.status = 'confirmed'
      AND b.startDate >= ${startDate}
      AND b.startDate <= ${endDate}
  `);
  
  // db.execute returns [rows, fields] for MySQL
  const ytdBookings = Array.isArray(ytdBookingsResult) && ytdBookingsResult.length > 0 
    ? (Array.isArray(ytdBookingsResult[0]) ? ytdBookingsResult[0] : ytdBookingsResult) 
    : [];
  
  console.log('[YTD Debug] Bookings found:', ytdBookings.length);
  if (ytdBookings.length > 0) {
    console.log('[YTD Debug] First booking:', ytdBookings[0]);
  }
  
  // Debug: Check what bookings exist in the database using raw SQL
  const rawBookings = await db.execute(sql`
    SELECT b.siteId, b.status, b.startDate, b.ownerAmount, s.id as sites_table_id
    FROM bookings b
    LEFT JOIN sites s ON b.siteId = s.id
    WHERE b.status = 'confirmed' AND b.startDate >= '2025-07-01'
    LIMIT 5
  `);
  console.log('[YTD Debug] Raw SQL bookings:', JSON.stringify(rawBookings, null, 2));
  
  // Debug: Check if any bookings have startDate before today
  const pastBookings = await db.execute(sql`
    SELECT COUNT(*) as cnt, MIN(startDate) as earliest, MAX(startDate) as latest
    FROM bookings 
    WHERE status = 'confirmed' AND startDate >= '2025-07-01' AND startDate < '2026-01-18'
  `);
  console.log('[YTD Debug] Past bookings (before today):', JSON.stringify(pastBookings, null, 2));
  
  // Calculate total revenue (owner's share)
  const totalRevenue = ytdBookings.reduce((sum: number, b: any) => sum + parseFloat(b.ownerAmount), 0);
  console.log('[YTD Debug] Total Revenue:', totalRevenue);
  
  // Calculate total booked days
  const totalBookedDays = ytdBookings.reduce((sum: number, b: any) => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return sum + days;
  }, 0);
  
  // Find top performing site by revenue
  const siteRevenues = new Map<number, { revenue: number; name: string; centreName: string }>();
  ytdBookings.forEach((b: any) => {
    const current = siteRevenues.get(b.siteId) || { revenue: 0, name: b.siteName, centreName: b.centreName };
    current.revenue += parseFloat(b.ownerAmount);
    siteRevenues.set(b.siteId, current);
  });
  
  let topSite: { siteId: number; siteName: string; centreName: string; revenue: number; bookedDays: number } | null = null;
  let maxRevenue = 0;
  
  siteRevenues.forEach((data: any, siteId: number) => {
    if (data.revenue > maxRevenue) {
      maxRevenue = data.revenue;
      // Calculate booked days for this site
      const siteBookings = ytdBookings.filter((b: any) => b.siteId === siteId);
      const bookedDays = siteBookings.reduce((sum: number, b: any) => {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      
      topSite = {
        siteId,
        siteName: data.name,
        centreName: data.centreName,
        revenue: data.revenue,
        bookedDays,
      };
    }
  });
  
  return {
    totalRevenue,
    totalBookedDays,
    topSite,
  };
}

/**
 * Calculate monthly metrics for a specific month
 */
export async function getMonthlyMetrics(siteIds: number[], month: number, year: number) {
  const db = await getDb();
  if (!db || siteIds.length === 0) {
    return {
      totalRevenue: 0,
      totalBookedDays: 0,
      topSite: null,
    };
  }
  
  const startDate = new Date(year, month - 1, 1); // First day of month
  const endDate = new Date(year, month, 0); // Last day of month
  
  // Get all confirmed bookings in month for permitted sites
  const monthBookings = await db
    .select({
      siteId: bookings.siteId,
      siteName: sites.siteNumber,
      centreName: shoppingCentres.name,
      ownerAmount: bookings.ownerAmount,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
    })
    .from(bookings)
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(
      and(
        inArray(bookings.siteId, siteIds),
        eq(bookings.status, 'confirmed'),
        gte(bookings.startDate, startDate),
        lte(bookings.endDate, endDate)
      )
    );
  
  // Calculate total revenue
  const totalRevenue = monthBookings.reduce((sum: number, b: any) => sum + parseFloat(b.ownerAmount), 0);
  
  // Calculate total booked days
  const totalBookedDays = monthBookings.reduce((sum: number, b: any) => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return sum + days;
  }, 0);
  
  // Find top performing site
  const siteRevenues = new Map<number, { revenue: number; name: string; centreName: string }>();
  monthBookings.forEach((b: any) => {
    const current = siteRevenues.get(b.siteId) || { revenue: 0, name: b.siteName, centreName: b.centreName };
    current.revenue += parseFloat(b.ownerAmount);
    siteRevenues.set(b.siteId, current);
  });
  
  let topSite: { siteId: number; siteName: string; centreName: string; revenue: number; bookedDays: number } | null = null;
  let maxRevenue = 0;
  
  siteRevenues.forEach((data: any, siteId: number) => {
    if (data.revenue > maxRevenue) {
      maxRevenue = data.revenue;
      const siteBookings = monthBookings.filter((b: any) => b.siteId === siteId);
      const bookedDays = siteBookings.reduce((sum: number, b: any) => {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      
      topSite = {
        siteId,
        siteName: data.name,
        centreName: data.centreName,
        revenue: data.revenue,
        bookedDays,
      };
    }
  });
  
  return {
    totalRevenue,
    totalBookedDays,
    topSite,
  };
}

/**
 * Get budget data for annual and YTD calculations
 */
export async function getBudgetMetrics(siteIds: number[], month: number, year: number) {
  const db = await getDb();
  if (!db || siteIds.length === 0) {
    return {
      annualBudget: 0,
      ytdBudget: 0,
    };
  }
  
  // Get all budgets for the year for permitted sites
  const yearBudgets = await db
    .select({
      budgetAmount: budgets.budgetAmount,
      month: budgets.month,
    })
    .from(budgets)
    .where(
      and(
        inArray(budgets.siteId, siteIds),
        eq(budgets.year, year)
      )
    );
  
  // Calculate annual budget (sum of all 12 months)
  const annualBudget = yearBudgets.reduce((sum: number, b: any) => sum + parseFloat(b.budgetAmount), 0);
  
  // Calculate YTD budget (sum of months 1 to current month)
  const ytdBudget = yearBudgets
    .filter((b: any) => b.month <= month)
    .reduce((sum: number, b: any) => sum + parseFloat(b.budgetAmount), 0);
  
  return {
    annualBudget,
    ytdBudget,
  };
}

/**
 * Get count of pending approval bookings for permitted sites
 */
export async function getPendingApprovalsCount(siteIds: number[]): Promise<number> {
  const db = await getDb();
  if (!db || siteIds.length === 0) return 0;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .where(
      and(
        inArray(bookings.siteId, siteIds),
        eq(bookings.status, 'pending'),
        eq(bookings.requiresApproval, true)
      )
    );
  
  return result[0]?.count || 0;
}

/**
 * Get list of states that have centres (for state filter dropdown)
 */
export async function getAvailableStates(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const states = await db
    .selectDistinct({ state: shoppingCentres.state })
    .from(shoppingCentres)
    .where(sql`${shoppingCentres.state} IS NOT NULL`);
  
  return states.map((s: { state: string | null }) => s.state).filter(Boolean).sort() as string[];
}

/**
 * Get per-site budget vs actual breakdown for drill-down modal
 */
export async function getSiteBreakdown(
  userRole: string,
  assignedState: string | null,
  year: number,
  breakdownType: 'annual' | 'ytd',
  state?: string
): Promise<Array<{
  siteId: number;
  siteName: string;
  centreName: string;
  budget: number;
  actual: number;
  variance: number;
  percentAchieved: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  // Get permitted site IDs
  const permittedSiteIds = await getPermittedSiteIds(userRole, assignedState);
  if (permittedSiteIds.length === 0) return [];

  // Determine date range
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const startMonth = 1;
  const endMonth = breakdownType === 'ytd' ? currentMonth : 12;

  // Build site list with centre info
  // Determine state filter
  let stateFilter: string | null = null;
  if (state && state !== 'all') {
    stateFilter = state;
  } else if ((userRole === 'mega_state_admin' || userRole === 'owner_state_admin') && assignedState) {
    stateFilter = assignedState;
  }

  // Build query with state filter if needed
  const sitesList = stateFilter
    ? await db
        .select({
          siteId: sites.id,
          siteName: sites.siteNumber,
          centreName: shoppingCentres.name,
          centreState: shoppingCentres.state,
        })
        .from(sites)
        .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
        .where(
          and(
            inArray(sites.id, permittedSiteIds),
            eq(shoppingCentres.state, stateFilter)
          )
        )
    : await db
        .select({
          siteId: sites.id,
          siteName: sites.siteNumber,
          centreName: shoppingCentres.name,
          centreState: shoppingCentres.state,
        })
        .from(sites)
        .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
        .where(inArray(sites.id, permittedSiteIds));

  // For each site, calculate budget and actual
  const breakdown = await Promise.all(
    sitesList.map(async (site: any) => {
      // Get budget sum for the period
      const budgetResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(${budgets.budgetAmount}), 0)`,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.siteId, site.siteId),
            eq(budgets.year, year),
            gte(budgets.month, startMonth),
            lte(budgets.month, endMonth)
          )
        );

      const budget = parseFloat(budgetResult[0]?.total || '0');

      // Get actual revenue for the period
      const actualResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(${bookings.ownerAmount}), 0)`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.siteId, site.siteId),
            eq(bookings.status, 'confirmed'),
            gte(bookings.startDate, new Date(`${year}-${String(startMonth).padStart(2, '0')}-01`)),
            lte(bookings.startDate, new Date(`${year}-${String(endMonth).padStart(2, '0')}-31`))
          )
        );

      const actual = parseFloat(actualResult[0]?.total || '0');
      const variance = actual - budget;
      const percentAchieved = budget > 0 ? (actual / budget) * 100 : 0;

      return {
        siteId: site.siteId,
        siteName: `Site ${site.siteName}`,
        centreName: site.centreName,
        budget,
        actual,
        variance,
        percentAchieved,
      };
    })
  );

  // Sort by variance (worst performers first)
  return breakdown.sort((a, b) => a.variance - b.variance);
}
