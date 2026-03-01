import { getConfigValue, setConfigValue } from "./systemConfigDb";

export interface AutoApprovalRules {
  enabled: boolean;
  maxBookingValue: number | null;
  minPriorBookings: number | null;
  requireValidInsurance: boolean;
  allowedCategoryIds: number[] | null;
  excludeCentreIds: number[] | null;
}

const DEFAULT_RULES: AutoApprovalRules = {
  enabled: false,
  maxBookingValue: null,
  minPriorBookings: null,
  requireValidInsurance: true,
  allowedCategoryIds: null,
  excludeCentreIds: null,
};

const CONFIG_KEY = "auto_approval_rules";

export async function getAutoApprovalRules(): Promise<AutoApprovalRules> {
  const value = await getConfigValue(CONFIG_KEY);
  if (!value) return DEFAULT_RULES;
  try {
    return { ...DEFAULT_RULES, ...JSON.parse(value) };
  } catch {
    return DEFAULT_RULES;
  }
}

export async function setAutoApprovalRules(rules: AutoApprovalRules): Promise<void> {
  await setConfigValue(CONFIG_KEY, JSON.stringify(rules));
}

export interface AutoApprovalContext {
  totalAmount: number;
  customerId: number;
  centreId: number;
  usageCategoryId: number | null;
  insuranceExpiry: Date | null;
  bookingEndDate: Date;
}

export interface AutoApprovalResult {
  approved: boolean;
  reasons: string[];
  failedChecks: string[];
}

export async function evaluateAutoApproval(ctx: AutoApprovalContext): Promise<AutoApprovalResult> {
  const rules = await getAutoApprovalRules();
  const reasons: string[] = [];
  const failedChecks: string[] = [];

  if (!rules.enabled) {
    return { approved: false, reasons: [], failedChecks: ["Auto-approval is disabled"] };
  }

  // Check excluded centres
  if (rules.excludeCentreIds && rules.excludeCentreIds.includes(ctx.centreId)) {
    failedChecks.push(`Centre ID ${ctx.centreId} is excluded from auto-approval`);
    return { approved: false, reasons, failedChecks };
  }

  // Check booking value threshold
  if (rules.maxBookingValue !== null) {
    if (ctx.totalAmount <= rules.maxBookingValue) {
      reasons.push(`Booking value $${ctx.totalAmount.toFixed(2)} <= threshold $${rules.maxBookingValue.toFixed(2)}`);
    } else {
      failedChecks.push(`Booking value $${ctx.totalAmount.toFixed(2)} exceeds threshold $${rules.maxBookingValue.toFixed(2)}`);
    }
  }

  // Check prior booking history
  if (rules.minPriorBookings !== null) {
    const { getDb } = await import("./db");
    const { bookings } = await import("../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      const [result] = await db.select({
        count: sql<number>`count(*)`,
      })
        .from(bookings)
        .where(and(
          eq(bookings.customerId, ctx.customerId),
          eq(bookings.status, "confirmed")
        ));
      const priorCount = Number(result?.count ?? 0);
      if (priorCount >= rules.minPriorBookings) {
        reasons.push(`Customer has ${priorCount} prior confirmed bookings (min: ${rules.minPriorBookings})`);
      } else {
        failedChecks.push(`Customer has only ${priorCount} prior confirmed bookings (min: ${rules.minPriorBookings})`);
      }
    }
  }

  // Check insurance validity
  if (rules.requireValidInsurance) {
    if (ctx.insuranceExpiry) {
      const expiryDate = new Date(ctx.insuranceExpiry);
      if (expiryDate >= ctx.bookingEndDate) {
        reasons.push(`Insurance valid through ${expiryDate.toLocaleDateString("en-AU")}`);
      } else {
        failedChecks.push(`Insurance expires ${expiryDate.toLocaleDateString("en-AU")} before booking ends`);
      }
    } else {
      failedChecks.push("No insurance expiry date on file");
    }
  }

  // Check allowed categories
  if (rules.allowedCategoryIds !== null && ctx.usageCategoryId !== null) {
    if (rules.allowedCategoryIds.includes(ctx.usageCategoryId)) {
      reasons.push(`Category ID ${ctx.usageCategoryId} is in allowed list`);
    } else {
      failedChecks.push(`Category ID ${ctx.usageCategoryId} is not in allowed list`);
    }
  }

  const approved = failedChecks.length === 0;
  return { approved, reasons, failedChecks };
}
