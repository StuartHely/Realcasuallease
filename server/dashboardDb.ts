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
 * Calculate YTD metrics (Jan 1 to today)
 */
export async function getYTDMetrics(siteIds: number[], year: number) {
  const db = await getDb();
  if (!db || siteIds.length === 0) {
    return {
      totalRevenue: 0,
      totalBookedDays: 0,
      topSite: null,
    };
  }
  
  const startDate = new Date(year, 0, 1); // Jan 1
  const endDate = new Date(); // Today
  
  // Get all confirmed bookings in date range for permitted sites
  const ytdBookings = await db
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
  
  // Calculate total revenue (owner's share)
  const totalRevenue = ytdBookings.reduce((sum: number, b: any) => sum + parseFloat(b.ownerAmount), 0);
  
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
