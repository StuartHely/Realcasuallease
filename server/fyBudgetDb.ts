import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { fyPercentages, centreBudgets, shoppingCentres, sites, bookings, vacantShopBookings, vacantShops, thirdLineBookings, thirdLineIncome } from "../drizzle/schema";

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

export async function getCentreBudget(centreId: number, financialYear: number, budgetType: string = "casual_leasing") {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select()
    .from(centreBudgets)
    .where(
      and(
        eq(centreBudgets.centreId, centreId),
        eq(centreBudgets.financialYear, financialYear),
        eq(centreBudgets.budgetType, budgetType)
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function getCentreBudgetsForYear(financialYear: number, budgetType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const conditions = [eq(centreBudgets.financialYear, financialYear)];
  if (budgetType) {
    conditions.push(eq(centreBudgets.budgetType, budgetType));
  }

  return db
    .select({
      id: centreBudgets.id,
      centreId: centreBudgets.centreId,
      financialYear: centreBudgets.financialYear,
      budgetType: centreBudgets.budgetType,
      annualBudget: centreBudgets.annualBudget,
      centreName: shoppingCentres.name,
      centreState: shoppingCentres.state,
    })
    .from(centreBudgets)
    .innerJoin(shoppingCentres, eq(centreBudgets.centreId, shoppingCentres.id))
    .where(and(...conditions))
    .orderBy(shoppingCentres.name);
}

export async function upsertCentreBudget(data: {
  centreId: number;
  financialYear: number;
  annualBudget: string;
  budgetType?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const budgetType = data.budgetType ?? "casual_leasing";
  const existing = await getCentreBudget(data.centreId, data.financialYear, budgetType);
  
  if (existing) {
    await db
      .update(centreBudgets)
      .set({ annualBudget: data.annualBudget })
      .where(eq(centreBudgets.id, existing.id));
    return { ...existing, annualBudget: data.annualBudget };
  } else {
    await db.insert(centreBudgets).values({
      centreId: data.centreId,
      financialYear: data.financialYear,
      annualBudget: data.annualBudget,
      budgetType,
    });
    return { ...data, budgetType };
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
  cl: { annualBudget: number; ytdBudget: number };
  vs: { annualBudget: number; ytdBudget: number };
  tli: { annualBudget: number; ytdBudget: number };
}> {
  const emptyStream = { annualBudget: 0, ytdBudget: 0 };
  const db = await getDb();
  if (!db || centreIds.length === 0) {
    return {
      annualBudget: 0,
      ytdBudget: 0,
      monthlyBudgets: {},
      cl: { ...emptyStream },
      vs: { ...emptyStream },
      tli: { ...emptyStream },
    };
  }

  // Get FY percentages for the year
  const percentages = await getFyPercentages(financialYear);
  if (!percentages) {
    return {
      annualBudget: 0,
      ytdBudget: 0,
      monthlyBudgets: {},
      cl: { ...emptyStream },
      vs: { ...emptyStream },
      tli: { ...emptyStream },
    };
  }

  // Get all centre budgets for the year (all types)
  const budgets = await getCentreBudgetsForYear(financialYear);
  const filteredBudgets = budgets.filter((b: any) => centreIds.includes(b.centreId));

  // Group annual totals by budget type
  let clAnnual = 0;
  let vsAnnual = 0;
  let tliAnnual = 0;
  for (const b of filteredBudgets) {
    const amount = parseFloat(b.annualBudget);
    if (b.budgetType === 'vacant_shops') vsAnnual += amount;
    else if (b.budgetType === 'third_line_income') tliAnnual += amount;
    else clAnnual += amount;
  }

  // Combined total annual budget
  const annualBudget = clAnnual + vsAnnual + tliAnnual;

  // Calculate monthly budgets using combined total (backwards compat)
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

  // Calculate per-stream YTD using the same ratio
  const ytdRatio = annualBudget > 0 ? ytdBudget / annualBudget : 0;

  return {
    annualBudget,
    ytdBudget,
    monthlyBudgets,
    cl: { annualBudget: clAnnual, ytdBudget: clAnnual * ytdRatio },
    vs: { annualBudget: vsAnnual, ytdBudget: vsAnnual * ytdRatio },
    tli: { annualBudget: tliAnnual, ytdBudget: tliAnnual * ytdRatio },
  };
}

/**
 * Get permitted centre IDs based on user role, assigned state, and optional owner
 */
export async function getPermittedCentreIds(
  userRole: string,
  assignedState: string | null,
  assignedOwnerId?: number | null
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  // Build centre conditions
  const conditions = [];

  // State filter for state admins
  if ((userRole === 'mega_state_admin' || userRole === 'owner_state_admin') && assignedState) {
    conditions.push(eq(shoppingCentres.state, assignedState));
  } else if (userRole !== 'mega_admin' && userRole !== 'owner_super_admin') {
    return [];
  }

  // Owner filter: owner_* roles always filter by owner; mega roles optionally
  if (assignedOwnerId) {
    conditions.push(eq(shoppingCentres.ownerId, assignedOwnerId));
  }

  if (conditions.length > 0) {
    const centres = await db
      .select({ id: shoppingCentres.id })
      .from(shoppingCentres)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));
    return centres.map((c: any) => c.id);
  }

  // No filters — mega_admin sees everything
  const allCentres = await db.select({ id: shoppingCentres.id }).from(shoppingCentres);
  return allCentres.map((c: any) => c.id);
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
  state?: string,
  assignedOwnerId?: number | null
): Promise<Array<{
  centreId: number;
  centreName: string;
  centreState: string;
  budget: number;
  actual: number;
  variance: number;
  percentAchieved: number;
  clBudget: number;
  clActual: number;
  vsBudget: number;
  vsActual: number;
  tliBudget: number;
  tliActual: number;
  clRevenue: number;
  vsRevenue: number;
  tliRevenue: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  // Get permitted centre IDs
  const permittedCentreIds = await getPermittedCentreIds(userRole, assignedState, assignedOwnerId);
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

  // Get ALL centre budgets for the year (all types)
  const allBudgets = await getCentreBudgetsForYear(financialYear);
  const filteredBudgets = allBudgets.filter((b: any) => {
    const isPermitted = permittedCentreIds.includes(b.centreId);
    const matchesState = !stateFilter || b.centreState === stateFilter;
    return isPermitted && matchesState;
  });

  // Group budgets by centreId
  const centreMap = new Map<number, { centreName: string; centreState: string; clBudget: number; vsBudget: number; tliBudget: number }>();
  for (const b of filteredBudgets) {
    if (!centreMap.has(b.centreId)) {
      centreMap.set(b.centreId, { centreName: b.centreName, centreState: b.centreState || '', clBudget: 0, vsBudget: 0, tliBudget: 0 });
    }
    const entry = centreMap.get(b.centreId)!;
    const amount = parseFloat(b.annualBudget);
    if (b.budgetType === 'vacant_shops') entry.vsBudget += amount;
    else if (b.budgetType === 'third_line_income') entry.tliBudget += amount;
    else entry.clBudget += amount;
  }

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

  // For each centre, calculate budget and actual across all three streams
  const breakdown = await Promise.all(
    Array.from(centreMap.entries()).map(async ([centreId, centre]) => {
      // Apply budget type (annual vs ytd)
      const applyBudget = (annual: number) =>
        breakdownType === 'annual' ? annual : (annual * ytdPercentage) / 100;

      const clBudget = applyBudget(centre.clBudget);
      const vsBudget = applyBudget(centre.vsBudget);
      const tliBudget = applyBudget(centre.tliBudget);
      const budget = clBudget + vsBudget + tliBudget;

      const dateFilterStart = fyStartDate;
      const dateFilterEnd = breakdownType === 'annual' ? fyEndDate : ytdEndDate;

      // CL actual: bookings via sites
      let clActual = 0;
      const centresSites = await db
        .select({ siteId: sites.id })
        .from(sites)
        .where(eq(sites.centreId, centreId));
      const siteIds = centresSites.map((s: any) => s.siteId);
      if (siteIds.length > 0) {
        const clResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(${bookings.ownerAmount}), 0)`,
          })
          .from(bookings)
          .where(
            and(
              inArray(bookings.siteId, siteIds),
              eq(bookings.status, 'confirmed'),
              gte(bookings.startDate, dateFilterStart),
              lte(bookings.startDate, dateFilterEnd)
            )
          );
        clActual = parseFloat(clResult[0]?.total || '0');
      }

      // VS actual: vacantShopBookings via vacantShops
      const vsResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(${vacantShopBookings.ownerAmount}), 0)`,
        })
        .from(vacantShopBookings)
        .innerJoin(vacantShops, eq(vacantShopBookings.vacantShopId, vacantShops.id))
        .where(
          and(
            eq(vacantShops.centreId, centreId),
            eq(vacantShopBookings.status, 'confirmed'),
            gte(vacantShopBookings.startDate, dateFilterStart),
            lte(vacantShopBookings.startDate, dateFilterEnd)
          )
        );
      const vsActual = parseFloat(vsResult[0]?.total || '0');

      // TLI actual: thirdLineBookings via thirdLineIncome
      const tliResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(${thirdLineBookings.ownerAmount}), 0)`,
        })
        .from(thirdLineBookings)
        .innerJoin(thirdLineIncome, eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncome.id))
        .where(
          and(
            eq(thirdLineIncome.centreId, centreId),
            eq(thirdLineBookings.status, 'confirmed'),
            gte(thirdLineBookings.startDate, dateFilterStart),
            lte(thirdLineBookings.startDate, dateFilterEnd)
          )
        );
      const tliActual = parseFloat(tliResult[0]?.total || '0');

      const actual = clActual + vsActual + tliActual;
      const variance = actual - budget;
      const percentAchieved = budget > 0 ? (actual / budget) * 100 : 0;

      return {
        centreId,
        centreName: centre.centreName,
        centreState: centre.centreState,
        budget,
        actual,
        variance,
        percentAchieved,
        clBudget,
        clActual,
        vsBudget,
        vsActual,
        tliBudget,
        tliActual,
        clRevenue: clActual,
        vsRevenue: vsActual,
        tliRevenue: tliActual,
      };
    })
  );

  // Sort alphabetically by centre name
  return breakdown.sort((a, b) => a.centreName.localeCompare(b.centreName));
}


/**
 * Get centres that don't have a budget for the specified financial year
 */
export async function getCentresWithoutBudget(financialYear: number, budgetType: string = "casual_leasing") {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Get all centres
  const allCentres = await db
    .select({
      id: shoppingCentres.id,
      name: shoppingCentres.name,
      state: shoppingCentres.state,
    })
    .from(shoppingCentres)
    .orderBy(shoppingCentres.name);
  
  // Get centres that have budgets for this FY and budget type
  const centresWithBudget = await db
    .select({ centreId: centreBudgets.centreId })
    .from(centreBudgets)
    .where(
      and(
        eq(centreBudgets.financialYear, financialYear),
        eq(centreBudgets.budgetType, budgetType)
      )
    );
  
  const budgetedCentreIds = new Set(centresWithBudget.map((c: any) => c.centreId));
  
  // Return centres without budgets
  return allCentres.filter((c: any) => !budgetedCentreIds.has(c.id));
}

/**
 * Bulk import centre budgets from uploaded file data
 * Matches centre names case-insensitively
 */
export async function bulkImportCentreBudgets(
  financialYear: number,
  data: Array<{ centreName: string; annualBudget: string }>,
  budgetType: string = "casual_leasing"
): Promise<{
  imported: Array<{ centreId: number; centreName: string; annualBudget: string }>;
  unmatched: Array<{ centreName: string; annualBudget: string }>;
  updated: number;
  created: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Get all centres for matching
  const allCentres = await db
    .select({
      id: shoppingCentres.id,
      name: shoppingCentres.name,
    })
    .from(shoppingCentres);
  
  // Create a map for case-insensitive matching
  const centreMap = new Map<string, { id: number; name: string }>();
  for (const centre of allCentres) {
    centreMap.set(centre.name.toLowerCase().trim(), centre);
  }
  
  const imported: Array<{ centreId: number; centreName: string; annualBudget: string }> = [];
  const unmatched: Array<{ centreName: string; annualBudget: string }> = [];
  let updated = 0;
  let created = 0;
  
  for (const row of data) {
    const normalizedName = row.centreName.toLowerCase().trim();
    const matchedCentre = centreMap.get(normalizedName);
    
    if (matchedCentre) {
      // Check if budget already exists for this centre/FY/type
      const existing = await getCentreBudget(matchedCentre.id, financialYear, budgetType);
      
      if (existing) {
        // Update existing budget
        await db
          .update(centreBudgets)
          .set({ annualBudget: row.annualBudget })
          .where(eq(centreBudgets.id, existing.id));
        updated++;
      } else {
        // Create new budget
        await db.insert(centreBudgets).values({
          centreId: matchedCentre.id,
          financialYear,
          annualBudget: row.annualBudget,
          budgetType,
        });
        created++;
      }
      
      imported.push({
        centreId: matchedCentre.id,
        centreName: matchedCentre.name,
        annualBudget: row.annualBudget,
      });
    } else {
      unmatched.push(row);
    }
  }
  
  return { imported, unmatched, updated, created };
}
