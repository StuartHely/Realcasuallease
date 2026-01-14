import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { fyPercentages, centreBudgets, shoppingCentres, sites, bookings } from "../drizzle/schema";

// FY Percentages CRUD

export async function getFyPercentages(financialYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select()
    .from(fyPercentages)
    .where(eq(fyPercentages.financialYear, financialYear))
    .limit(1);
  return result[0] || null;
}

export async function getAllFyPercentages() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(fyPercentages)
    .orderBy(desc(fyPercentages.financialYear));
}

export async function upsertFyPercentages(data: {
  financialYear: number;
  july: string;
  august: string;
  september: string;
  october: string;
  november: string;
  december: string;
  january: string;
  february: string;
  march: string;
  april: string;
  may: string;
  june: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const existing = await getFyPercentages(data.financialYear);
  
  if (existing) {
    await db
      .update(fyPercentages)
      .set({
        july: data.july,
        august: data.august,
        september: data.september,
        october: data.october,
        november: data.november,
        december: data.december,
        january: data.january,
        february: data.february,
        march: data.march,
        april: data.april,
        may: data.may,
        june: data.june,
      })
      .where(eq(fyPercentages.id, existing.id));
    return { ...existing, ...data };
  } else {
    await db.insert(fyPercentages).values(data);
    return data;
  }
}

// Centre Budgets CRUD

export async function getCentreBudget(centreId: number, financialYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select()
    .from(centreBudgets)
    .where(
      and(
        eq(centreBudgets.centreId, centreId),
        eq(centreBudgets.financialYear, financialYear)
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function getCentreBudgetsForYear(financialYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select({
      id: centreBudgets.id,
      centreId: centreBudgets.centreId,
      financialYear: centreBudgets.financialYear,
      annualBudget: centreBudgets.annualBudget,
      centreName: shoppingCentres.name,
      centreState: shoppingCentres.state,
    })
    .from(centreBudgets)
    .innerJoin(shoppingCentres, eq(centreBudgets.centreId, shoppingCentres.id))
    .where(eq(centreBudgets.financialYear, financialYear))
    .orderBy(shoppingCentres.name);
}

export async function upsertCentreBudget(data: {
  centreId: number;
  financialYear: number;
  annualBudget: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const existing = await getCentreBudget(data.centreId, data.financialYear);
  
  if (existing) {
    await db
      .update(centreBudgets)
      .set({ annualBudget: data.annualBudget })
      .where(eq(centreBudgets.id, existing.id));
    return { ...existing, annualBudget: data.annualBudget };
  } else {
    await db.insert(centreBudgets).values(data);
    return data;
  }
}

export async function deleteCentreBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(centreBudgets).where(eq(centreBudgets.id, id));
}

// Calculate monthly budgets from annual budget and percentages
export function calculateMonthlyBudgets(
  annualBudget: number,
  percentages: {
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
  }
) {
  return {
    july: (annualBudget * parseFloat(percentages.july)) / 100,
    august: (annualBudget * parseFloat(percentages.august)) / 100,
    september: (annualBudget * parseFloat(percentages.september)) / 100,
    october: (annualBudget * parseFloat(percentages.october)) / 100,
    november: (annualBudget * parseFloat(percentages.november)) / 100,
    december: (annualBudget * parseFloat(percentages.december)) / 100,
    january: (annualBudget * parseFloat(percentages.january)) / 100,
    february: (annualBudget * parseFloat(percentages.february)) / 100,
    march: (annualBudget * parseFloat(percentages.march)) / 100,
    april: (annualBudget * parseFloat(percentages.april)) / 100,
    may: (annualBudget * parseFloat(percentages.may)) / 100,
    june: (annualBudget * parseFloat(percentages.june)) / 100,
  };
}

// Get all centres for dropdown
export async function getAllCentresForBudget() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select({
      id: shoppingCentres.id,
      name: shoppingCentres.name,
      state: shoppingCentres.state,
    })
    .from(shoppingCentres)
    .orderBy(shoppingCentres.name);
}


/**
 * Get FY budget metrics for Portfolio Dashboard
 * Uses centre-level budgets with monthly percentage distribution
 * Financial year runs July to June
 */
export async function getFYBudgetMetrics(
  centreIds: number[],
  financialYear: number
): Promise<{
  annualBudget: number;
  ytdBudget: number;
  monthlyBudgets: Record<string, number>;
}> {
  const db = await getDb();
  if (!db || centreIds.length === 0) {
    return {
      annualBudget: 0,
      ytdBudget: 0,
      monthlyBudgets: {},
    };
  }

  // Get FY percentages for the year
  const percentages = await getFyPercentages(financialYear);
  if (!percentages) {
    return {
      annualBudget: 0,
      ytdBudget: 0,
      monthlyBudgets: {},
    };
  }

  // Get centre budgets for the year
  const budgets = await getCentreBudgetsForYear(financialYear);
  const filteredBudgets = budgets.filter((b: any) => centreIds.includes(b.centreId));

  // Calculate total annual budget
  const annualBudget = filteredBudgets.reduce(
    (sum: number, b: any) => sum + parseFloat(b.annualBudget),
    0
  );

  // Calculate monthly budgets using percentages
  const monthlyBudgets = calculateMonthlyBudgets(annualBudget, percentages);

  // Determine which months are in YTD based on current date
  // FY runs July (month 7) to June (month 6)
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Determine FY start year (e.g., FY 2026 starts July 2025)
  const fyStartYear = financialYear - 1;

  // Calculate YTD budget (sum of completed months in current FY)
  let ytdBudget = 0;

  // July to December of FY start year
  if (currentYear > fyStartYear || (currentYear === fyStartYear && currentMonth >= 7)) {
    if (currentYear > fyStartYear) {
      // All of Jul-Dec are complete
      ytdBudget += monthlyBudgets.july + monthlyBudgets.august + monthlyBudgets.september +
                   monthlyBudgets.october + monthlyBudgets.november + monthlyBudgets.december;
    } else {
      // Only months up to current month
      const fyMonths = ['july', 'august', 'september', 'october', 'november', 'december'];
      const monthsToInclude = currentMonth - 6; // July = 7, so 7-6=1 month
      for (let i = 0; i < monthsToInclude && i < fyMonths.length; i++) {
        ytdBudget += monthlyBudgets[fyMonths[i] as keyof typeof monthlyBudgets];
      }
    }
  }

  // January to June of FY end year
  if (currentYear === financialYear && currentMonth >= 1 && currentMonth <= 6) {
    const fyMonths = ['january', 'february', 'march', 'april', 'may', 'june'];
    for (let i = 0; i < currentMonth; i++) {
      ytdBudget += monthlyBudgets[fyMonths[i] as keyof typeof monthlyBudgets];
    }
  }

  return {
    annualBudget,
    ytdBudget,
    monthlyBudgets,
  };
}

/**
 * Get permitted centre IDs based on user role and assigned state
 */
export async function getPermittedCentreIds(
  userRole: string,
  assignedState: string | null
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  // National admins see everything
  if (userRole === 'mega_admin' || userRole === 'owner_super_admin') {
    const allCentres = await db.select({ id: shoppingCentres.id }).from(shoppingCentres);
    return allCentres.map((c: any) => c.id);
  }

  // State admins see only their state
  if ((userRole === 'mega_state_admin' || userRole === 'owner_state_admin') && assignedState) {
    const stateCentres = await db
      .select({ id: shoppingCentres.id })
      .from(shoppingCentres)
      .where(eq(shoppingCentres.state, assignedState));
    return stateCentres.map((c: any) => c.id);
  }

  return [];
}

/**
 * Get current financial year (July-June)
 */
export function getCurrentFinancialYear(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  // If July or later, we're in FY ending next year
  return month >= 6 ? year + 1 : year;
}


/**
 * Get per-centre budget vs actual breakdown for drill-down modal
 * Uses FY centre budgets instead of site-level budgets
 */
export async function getCentreBreakdown(
  userRole: string,
  assignedState: string | null,
  financialYear: number,
  breakdownType: 'annual' | 'ytd',
  state?: string
): Promise<Array<{
  centreId: number;
  centreName: string;
  centreState: string;
  budget: number;
  actual: number;
  variance: number;
  percentAchieved: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  // Get permitted centre IDs
  const permittedCentreIds = await getPermittedCentreIds(userRole, assignedState);
  if (permittedCentreIds.length === 0) return [];

  // Get FY percentages for the year
  const percentages = await getFyPercentages(financialYear);
  
  // Determine state filter
  let stateFilter: string | null = null;
  if (state && state !== 'all') {
    stateFilter = state;
  } else if ((userRole === 'mega_state_admin' || userRole === 'owner_state_admin') && assignedState) {
    stateFilter = assignedState;
  }

  // Get centre budgets for the year with state filter
  const allBudgets = await getCentreBudgetsForYear(financialYear);
  const filteredBudgets = allBudgets.filter((b: any) => {
    const isPermitted = permittedCentreIds.includes(b.centreId);
    const matchesState = !stateFilter || b.centreState === stateFilter;
    return isPermitted && matchesState;
  });

  // Calculate YTD percentage based on current date and FY
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const fyStartYear = financialYear - 1;

  // Calculate YTD percentage of annual budget
  let ytdPercentage = 0;
  if (percentages) {
    // July to December of FY start year
    if (currentYear > fyStartYear || (currentYear === fyStartYear && currentMonth >= 7)) {
      if (currentYear > fyStartYear) {
        // All of Jul-Dec are complete
        ytdPercentage += parseFloat(percentages.july) + parseFloat(percentages.august) + 
                         parseFloat(percentages.september) + parseFloat(percentages.october) + 
                         parseFloat(percentages.november) + parseFloat(percentages.december);
      } else {
        // Only months up to current month
        const fyMonths = ['july', 'august', 'september', 'october', 'november', 'december'] as const;
        const monthsToInclude = currentMonth - 6;
        for (let i = 0; i < monthsToInclude && i < fyMonths.length; i++) {
          ytdPercentage += parseFloat(percentages[fyMonths[i]]);
        }
      }
    }

    // January to June of FY end year
    if (currentYear === financialYear && currentMonth >= 1 && currentMonth <= 6) {
      const fyMonths = ['january', 'february', 'march', 'april', 'may', 'june'] as const;
      for (let i = 0; i < currentMonth; i++) {
        ytdPercentage += parseFloat(percentages[fyMonths[i]]);
      }
    }
  }

  // Calculate FY date range for actual revenue
  const fyStartDate = new Date(`${fyStartYear}-07-01`);
  const fyEndDate = new Date(`${financialYear}-06-30`);
  const ytdEndDate = now < fyEndDate ? now : fyEndDate;

  // For each centre, calculate budget and actual
  const breakdown = await Promise.all(
    filteredBudgets.map(async (centreBudget: any) => {
      const annualBudget = parseFloat(centreBudget.annualBudget);
      
      // Calculate budget based on breakdown type
      const budget = breakdownType === 'annual' 
        ? annualBudget 
        : (annualBudget * ytdPercentage) / 100;

      // Get actual revenue for the centre (sum of all sites in this centre)
      // First get all site IDs for this centre
      const centresSites = await db
        .select({ siteId: sites.id })
        .from(sites)
        .where(eq(sites.centreId, centreBudget.centreId));
      
      const siteIds = centresSites.map((s: any) => s.siteId);
      
      let actual = 0;
      if (siteIds.length > 0) {
        const dateFilter = breakdownType === 'annual'
          ? and(
              gte(bookings.startDate, fyStartDate),
              lte(bookings.startDate, fyEndDate)
            )
          : and(
              gte(bookings.startDate, fyStartDate),
              lte(bookings.startDate, ytdEndDate)
            );

        const actualResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(${bookings.ownerAmount}), 0)`,
          })
          .from(bookings)
          .where(
            and(
              inArray(bookings.siteId, siteIds),
              eq(bookings.status, 'confirmed'),
              dateFilter
            )
          );
        
        actual = parseFloat(actualResult[0]?.total || '0');
      }

      const variance = actual - budget;
      const percentAchieved = budget > 0 ? (actual / budget) * 100 : 0;

      return {
        centreId: centreBudget.centreId,
        centreName: centreBudget.centreName,
        centreState: centreBudget.centreState || '',
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
