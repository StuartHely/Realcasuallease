import { integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, bigint, index, serial, jsonb } from "drizzle-orm/pg-core";

// =============================================================================
// PostgreSQL Enums (defined before tables that use them)
// =============================================================================

export const roleEnum = pgEnum("role", [
  "customer",
  "owner_centre_manager",
  "owner_marketing_manager",
  "owner_regional_admin",
  "owner_state_admin",
  "owner_super_admin",
  "mega_state_admin",
  "mega_admin"
]);

export const remittanceTypeEnum = pgEnum("remittance_type", ["per_booking", "monthly"]);

export const weekdayEnum = pgEnum("weekday", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "cancelled", "completed", "rejected"]);

export const paymentMethodEnum = pgEnum("payment_method", ["stripe", "invoice"]);

export const transactionTypeEnum = pgEnum("transaction_type", ["booking", "cancellation", "monthly_fee"]);

// =============================================================================
// Tables
// =============================================================================

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for the platform.
 * Supports both OAuth (via openId) and username/password authentication.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("customer").notNull(),
  assignedState: varchar("assignedState", { length: 3 }), // For state_admin roles: NSW, VIC, QLD, etc.
  allocatedLogoId: varchar("allocated_logo_id", { length: 20 }), // For owners: which logo to use (logo_1, logo_2, etc.)
  canPayByInvoice: boolean("canPayByInvoice").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Customer/Tenant profile with registration details
 */
export const customerProfiles = pgTable("customer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  companyName: varchar("companyName", { length: 255 }),
  tradingName: varchar("tradingName", { length: 255 }),
  website: varchar("website", { length: 255 }),
  abn: varchar("abn", { length: 11 }),
  streetAddress: text("streetAddress"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  postcode: varchar("postcode", { length: 10 }),
  productCategory: varchar("productCategory", { length: 255 }),
  productDetails: text("productDetails"),
  insuranceCompany: varchar("insuranceCompany", { length: 255 }),
  insurancePolicyNo: varchar("insurancePolicyNo", { length: 100 }),
  insuranceAmount: decimal("insuranceAmount", { precision: 12, scale: 2 }),
  insuranceExpiry: timestamp("insuranceExpiry"),
  insuranceDocumentUrl: text("insuranceDocumentUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

/**
 * Shopping centre owners/managers with bank details and fee configuration
 */
export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  bankName: varchar("bankName", { length: 255 }),
  bankAccountName: varchar("bankAccountName", { length: 255 }),
  bankBsb: varchar("bankBsb", { length: 10 }),
  bankAccountNumber: varchar("bankAccountNumber", { length: 20 }),
  monthlyFee: decimal("monthlyFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  remittanceType: remittanceTypeEnum("remittanceType").default("monthly").notNull(),
  invoiceEmail1: varchar("invoiceEmail1", { length: 320 }),
  invoiceEmail2: varchar("invoiceEmail2", { length: 320 }),
  invoiceEmail3: varchar("invoiceEmail3", { length: 320 }),
  remittanceEmail1: varchar("remittanceEmail1", { length: 320 }),
  remittanceEmail2: varchar("remittanceEmail2", { length: 320 }),
  remittanceEmail3: varchar("remittanceEmail3", { length: 320 }),
  remittanceEmail4: varchar("remittanceEmail4", { length: 320 }),
  remittanceEmail5: varchar("remittanceEmail5", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Floor levels for multi-level shopping centres
 */
export const floorLevels = pgTable("floor_levels", {
  id: serial("id").primaryKey(),
  centreId: integer("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  levelName: varchar("levelName", { length: 100 }).notNull(), // e.g., "Ground Floor", "Level 1", "Level 2"
  levelNumber: varchar("levelNumber", { length: 20 }).notNull(), // e.g., "G", "L1", "M", "Coles Level"
  mapImageUrl: text("mapImageUrl"),
  displayOrder: integer("displayOrder").notNull(), // For custom ordering
  isHidden: boolean("isHidden").default(false).notNull(), // Soft delete - hide from public but preserve historical data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  centreIdIdx: index("floor_centreId_idx").on(table.centreId),
}));

/**
 * Shopping centres
 */
export const shoppingCentres = pgTable("shopping_centres", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull().references(() => owners.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  centreCode: varchar("centreCode", { length: 50 }),
  address: text("address"),
  suburb: varchar("suburb", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  postcode: varchar("postcode", { length: 10 }),
  description: text("description"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  majors: text("majors"),
  numberOfSpecialties: integer("numberOfSpecialties"),
  weeklyReportEmail1: varchar("weeklyReportEmail1", { length: 320 }),
  weeklyReportEmail2: varchar("weeklyReportEmail2", { length: 320 }),
  weeklyReportEmail3: varchar("weeklyReportEmail3", { length: 320 }),
  weeklyReportEmail4: varchar("weeklyReportEmail4", { length: 320 }),
  weeklyReportEmail5: varchar("weeklyReportEmail5", { length: 320 }),
  weeklyReportEmail6: varchar("weeklyReportEmail6", { length: 320 }),
  weeklyReportEmail7: varchar("weeklyReportEmail7", { length: 320 }),
  weeklyReportEmail8: varchar("weeklyReportEmail8", { length: 320 }),
  weeklyReportEmail9: varchar("weeklyReportEmail9", { length: 320 }),
  weeklyReportEmail10: varchar("weeklyReportEmail10", { length: 320 }),
  weeklyReportTimezone: varchar("weeklyReportTimezone", { length: 50 }).default("Australia/Sydney"),
  weeklyReportNextOverrideDay: weekdayEnum("weeklyReportNextOverrideDay"),
  includeInMainSite: boolean("includeInMainSite").default(true).notNull(),
  mapImageUrl: text("mapImageUrl"),
  totalTablesAvailable: integer("totalTablesAvailable").default(0),
  totalChairsAvailable: integer("totalChairsAvailable").default(0),
  contactPhone: varchar("contactPhone", { length: 20 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  operatingHours: text("operatingHours"),
  policies: text("policies"),
  // PDF attachments with display names
  pdfUrl1: text("pdfUrl1"),
  pdfName1: varchar("pdfName1", { length: 255 }),
  pdfUrl2: text("pdfUrl2"),
  pdfName2: varchar("pdfName2", { length: 255 }),
  pdfUrl3: text("pdfUrl3"),
  pdfName3: varchar("pdfName3", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  ownerIdIdx: index("centre_ownerId_idx").on(table.ownerId),
  nameIdx: index("centre_name_idx").on(table.name),
}));

/**
 * Sites/Spaces within shopping centres
 */
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  centreId: integer("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  siteNumber: varchar("siteNumber", { length: 50 }).notNull(),
  description: text("description"),
  size: varchar("size", { length: 100 }),
  maxTables: integer("maxTables"),
  powerAvailable: varchar("powerAvailable", { length: 100 }),
  restrictions: text("restrictions"),
  pricePerDay: decimal("pricePerDay", { precision: 10, scale: 2 }),
  pricePerWeek: decimal("pricePerWeek", { precision: 10, scale: 2 }),
  weekendPricePerDay: decimal("weekendPricePerDay", { precision: 10, scale: 2 }),
  instantBooking: boolean("instantBooking").default(true).notNull(),
  imageUrl1: text("imageUrl1"),
  imageUrl2: text("imageUrl2"),
  imageUrl3: text("imageUrl3"),
  imageUrl4: text("imageUrl4"),
  videoUrl: text("videoUrl"),
  floorLevelId: integer("floorLevelId").references(() => floorLevels.id, { onDelete: "set null" }), // null for single-level centres
  mapMarkerX: decimal("mapMarkerX", { precision: 5, scale: 2 }),
  mapMarkerY: decimal("mapMarkerY", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  hasPanorama: boolean("hasPanorama").default(false).notNull(),
  panoramaImageUrl: text("panoramaImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  centreIdIdx: index("site_centreId_idx").on(table.centreId),
}));

/**
 * Usage categories for bookings (34 predefined categories)
 */
export const usageCategories = pgTable("usage_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isFree: boolean("isFree").default(false).notNull(), // true for "Charities (Free)" and "Government (Free)"
  displayOrder: integer("displayOrder").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Junction table: which usage categories are approved for which sites
 */
export const siteUsageCategories = pgTable("site_usage_categories", {
  id: serial("id").primaryKey(),
  siteId: integer("siteId").notNull().references(() => sites.id, { onDelete: "cascade" }),
  categoryId: integer("categoryId").notNull().references(() => usageCategories.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index("suc_siteId_idx").on(table.siteId),
  categoryIdIdx: index("suc_categoryId_idx").on(table.categoryId),
  uniqueSiteCategory: index("suc_unique_site_category").on(table.siteId, table.categoryId),
}));

/**
 * Legacy usage types table (kept for backward compatibility)
 */
export const usageTypes = pgTable("usage_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Bookings
 */
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  siteId: integer("siteId").notNull().references(() => sites.id, { onDelete: "cascade" }),
  customerId: integer("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  usageTypeId: integer("usageTypeId").references(() => usageTypes.id),
  customUsage: text("customUsage"),
  usageCategoryId: integer("usageCategoryId").references(() => usageCategories.id),
  additionalCategoryText: text("additionalCategoryText"), // triggers manual approval if filled
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(), // Store GST rate at time of booking/transaction
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  approvedBy: integer("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  tablesRequested: integer("tablesRequested").default(0),
  chairsRequested: integer("chairsRequested").default(0),
  bringingOwnTables: boolean("bringingOwnTables").default(false).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paymentMethod: paymentMethodEnum("paymentMethod").default("stripe").notNull(),
  paidAt: timestamp("paidAt"),
  paymentRecordedBy: integer("paymentRecordedBy").references(() => users.id),
  paymentDueDate: timestamp("paymentDueDate"), // For invoice bookings - when payment is due
  remindersSent: integer("remindersSent").default(0).notNull(), // Count of payment reminders sent
  customerEmail: varchar("customerEmail", { length: 320 }),
  confirmationEmailSent: boolean("confirmationEmailSent").default(false).notNull(),
  reminderEmailSent: boolean("reminderEmailSent").default(false).notNull(),
  completionEmailSent: boolean("completionEmailSent").default(false).notNull(),
  lastReminderSent: timestamp("lastReminderSent"),
  adminComments: text("adminComments"), // Internal admin notes, never shown on invoices/emails
  createdByAdmin: integer("createdByAdmin").references(() => users.id), // If booking was created by admin on behalf of user
  invoiceOverride: boolean("invoiceOverride").default(false).notNull(), // Override Stripe user to pay by invoice for this booking
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index("booking_siteId_idx").on(table.siteId),
  customerIdIdx: index("booking_customerId_idx").on(table.customerId),
  startDateIdx: index("booking_startDate_idx").on(table.startDate),
  statusIdx: index("booking_status_idx").on(table.status),
  // Composite index for optimized date range queries in search
  siteIdDateRangeIdx: index("booking_siteId_date_range_idx").on(table.siteId, table.startDate, table.endDate),
}));

/**
 * Booking status history for audit trail
 */
export const bookingStatusHistory = pgTable("booking_status_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  previousStatus: bookingStatusEnum("previousStatus"),
  newStatus: bookingStatusEnum("newStatus").notNull(),
  changedBy: integer("changedBy").references(() => users.id),
  changedByName: varchar("changedByName", { length: 255 }),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bookingIdIdx: index("bsh_bookingId_idx").on(table.bookingId),
  createdAtIdx: index("bsh_createdAt_idx").on(table.createdAt),
}));

/**
 * Financial transactions (including reversals for cancellations)
 */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  ownerId: integer("ownerId").notNull().references(() => owners.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(), // Store GST rate at time of booking/transaction
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  remitted: boolean("remitted").default(false).notNull(),
  remittedAt: timestamp("remittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bookingIdIdx: index("tx_bookingId_idx").on(table.bookingId),
  ownerIdIdx: index("tx_ownerId_idx").on(table.ownerId),
  remittedIdx: index("tx_remitted_idx").on(table.remitted),
}));

/**
 * System configuration
 */
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  imageQuality: integer("image_quality").default(85),
  imageMaxWidth: integer("image_max_width").default(1200),
  imageMaxHeight: integer("image_max_height").default(800),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * FAQ (Frequently Asked Questions) for the homepage
 */
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Seasonal rates for sites
 */
export const seasonalRates = pgTable("seasonalRates", {
  id: serial("id").primaryKey(),
  siteId: integer("siteId").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Christmas 2024", "Summer Sale"
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  endDate: varchar("endDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  weekdayRate: decimal("weekdayRate", { precision: 10, scale: 2 }),
  weekendRate: decimal("weekendRate", { precision: 10, scale: 2 }),
  weeklyRate: decimal("weeklyRate", { precision: 10, scale: 2 }), // Override for 7+ day bookings
  createdAt: timestamp("createdAt").defaultNow(),
});

/**
 * Site budgets for portfolio performance tracking
 * Budgets are set per site per month for revenue targets
 */
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  siteId: integer("siteId").notNull().references(() => sites.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(), // e.g., 2026
  budgetAmount: decimal("budgetAmount", { precision: 12, scale: 2 }).notNull(), // Target revenue for this site/month
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index("budget_siteId_idx").on(table.siteId),
  monthYearIdx: index("budget_month_year_idx").on(table.month, table.year),
  uniqueSiteMonthYear: index("budget_unique_site_month_year").on(table.siteId, table.month, table.year),
}));

/**
 * Financial year monthly percentage distribution
 * Stores the percentage allocation for each month (July-June)
 */
export const fyPercentages = pgTable("fy_percentages", {
  id: serial("id").primaryKey(),
  financialYear: integer("financialYear").notNull(), // e.g., 2026 means FY 2025-26 (July 2025 - June 2026)
  july: decimal("july", { precision: 5, scale: 2 }).default("8.33").notNull(),
  august: decimal("august", { precision: 5, scale: 2 }).default("8.33").notNull(),
  september: decimal("september", { precision: 5, scale: 2 }).default("8.33").notNull(),
  october: decimal("october", { precision: 5, scale: 2 }).default("8.33").notNull(),
  november: decimal("november", { precision: 5, scale: 2 }).default("8.33").notNull(),
  december: decimal("december", { precision: 5, scale: 2 }).default("8.33").notNull(),
  january: decimal("january", { precision: 5, scale: 2 }).default("8.33").notNull(),
  february: decimal("february", { precision: 5, scale: 2 }).default("8.33").notNull(),
  march: decimal("march", { precision: 5, scale: 2 }).default("8.33").notNull(),
  april: decimal("april", { precision: 5, scale: 2 }).default("8.33").notNull(),
  may: decimal("may", { precision: 5, scale: 2 }).default("8.33").notNull(),
  june: decimal("june", { precision: 5, scale: 2 }).default("8.37").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  fyIdx: index("fyp_fy_idx").on(table.financialYear),
}));

/**
 * Centre annual budgets for financial year
 * Stores the total annual budget per centre
 */
export const centreBudgets = pgTable("centre_budgets", {
  id: serial("id").primaryKey(),
  centreId: integer("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  financialYear: integer("financialYear").notNull(), // e.g., 2026 means FY 2025-26
  annualBudget: decimal("annualBudget", { precision: 14, scale: 2 }).notNull(), // Total annual budget for the centre
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  centreIdIdx: index("cb_centreId_idx").on(table.centreId),
  fyIdx: index("cb_fy_idx").on(table.financialYear),
  uniqueCentreFy: index("cb_unique_centre_fy").on(table.centreId, table.financialYear),
}));

export const imageAnalytics = pgTable("imageAnalytics", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: 'cascade' }),
  imageSlot: integer("image_slot").notNull(), // 1-4
  viewCount: integer("view_count").default(0).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertImageAnalytics = typeof imageAnalytics.$inferInsert;
export type SelectImageAnalytics = typeof imageAnalytics.$inferSelect;

/**
 * Search analytics for tracking user searches and suggestions
 */
export const searchAnalytics = pgTable("search_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  query: text("query").notNull(),
  centreName: varchar("centreName", { length: 255 }),
  minSizeM2: decimal("minSizeM2", { precision: 10, scale: 2 }),
  productCategory: varchar("productCategory", { length: 255 }),
  resultsCount: integer("resultsCount").notNull(),
  hadResults: boolean("hadResults").notNull(),
  suggestionsShown: integer("suggestionsShown").default(0),
  suggestionClicked: boolean("suggestionClicked").default(false),
  clickedSuggestion: varchar("clickedSuggestion", { length: 255 }),
  searchDate: timestamp("searchDate").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  parsedIntent: jsonb("parsedIntent"),
  parserUsed: varchar("parserUsed", { length: 20 }),
  topResultScore: integer("topResultScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  searchDateIdx: index("sa_searchDate_idx").on(table.searchDate),
  hadResultsIdx: index("sa_hadResults_idx").on(table.hadResults),
  createdAtIdx: index("sa_createdAt_idx").on(table.createdAt),
}));

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytics = typeof searchAnalytics.$inferInsert;

/**
 * Cache for LLM-parsed search intents to avoid re-parsing identical queries
 */
export const searchIntentCache = pgTable("search_intent_cache", {
  id: serial("id").primaryKey(),
  queryHash: varchar("queryHash", { length: 64 }).notNull().unique(),
  normalizedQuery: text("normalizedQuery").notNull(),
  parsedIntent: jsonb("parsedIntent").notNull(),
  hitCount: integer("hitCount").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
}, (table) => ({
  queryHashIdx: index("sic_queryHash_idx").on(table.queryHash),
}));

export type SearchIntentCache = typeof searchIntentCache.$inferSelect;
export type InsertSearchIntentCache = typeof searchIntentCache.$inferInsert;

/**
 * Audit log for admin changes
 */
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: integer("entityId"),
  changes: text("changes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("al_userId_idx").on(table.userId),
  createdAtIdx: index("al_createdAt_idx").on(table.createdAt),
}));

/**
 * Third Line Income Categories (admin-managed)
 */
export const thirdLineCategories = pgTable("third_line_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  displayOrder: integer("displayOrder").notNull().default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Vacant Shops - Short-term physical retail tenancies
 */
export const vacantShops = pgTable("vacant_shops", {
  id: serial("id").primaryKey(),
  centreId: integer("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  shopNumber: varchar("shopNumber", { length: 50 }).notNull(),
  totalSizeM2: decimal("totalSizeM2", { precision: 10, scale: 2 }), // Total size in square metres
  dimensions: varchar("dimensions", { length: 100 }), // e.g., "5m x 8m"
  powered: boolean("powered").default(false).notNull(),
  description: text("description"),
  imageUrl1: text("imageUrl1"),
  imageUrl2: text("imageUrl2"),
  pricePerWeek: decimal("pricePerWeek", { precision: 10, scale: 2 }),
  pricePerMonth: decimal("pricePerMonth", { precision: 10, scale: 2 }),
  floorLevelId: integer("floorLevelId").references(() => floorLevels.id, { onDelete: "set null" }),
  mapMarkerX: decimal("mapMarkerX", { precision: 5, scale: 2 }),
  mapMarkerY: decimal("mapMarkerY", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  centreIdIdx: index("vs_centreId_idx").on(table.centreId),
  floorLevelIdIdx: index("vs_floorLevelId_idx").on(table.floorLevelId),
  isActiveIdx: index("vs_isActive_idx").on(table.isActive),
}));

/**
 * Third Line Income - Non-tenancy assets (vending, signage, etc.)
 */
export const thirdLineIncome = pgTable("third_line_income", {
  id: serial("id").primaryKey(),
  centreId: integer("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  assetNumber: varchar("assetNumber", { length: 50 }).notNull(),
  categoryId: integer("categoryId").notNull().references(() => thirdLineCategories.id, { onDelete: "restrict" }),
  dimensions: varchar("dimensions", { length: 100 }), // e.g., "1.5m x 0.8m"
  powered: boolean("powered").default(false).notNull(),
  description: text("description"),
  imageUrl1: text("imageUrl1"),
  imageUrl2: text("imageUrl2"),
  pricePerWeek: decimal("pricePerWeek", { precision: 10, scale: 2 }),
  pricePerMonth: decimal("pricePerMonth", { precision: 10, scale: 2 }),
  floorLevelId: integer("floorLevelId").references(() => floorLevels.id, { onDelete: "set null" }),
  mapMarkerX: decimal("mapMarkerX", { precision: 5, scale: 2 }),
  mapMarkerY: decimal("mapMarkerY", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  centreIdIdx: index("tli_centreId_idx").on(table.centreId),
  categoryIdIdx: index("tli_categoryId_idx").on(table.categoryId),
  floorLevelIdIdx: index("tli_floorLevelId_idx").on(table.floorLevelId),
  isActiveIdx: index("tli_isActive_idx").on(table.isActive),
}));

/**
 * Vacant Shop Bookings - Bookings for short-term vacant shop tenancies
 */
export const vacantShopBookings = pgTable("vacant_shop_bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  vacantShopId: integer("vacantShopId").notNull().references(() => vacantShops.id, { onDelete: "cascade" }),
  customerId: integer("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(),
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  approvedBy: integer("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paymentMethod: paymentMethodEnum("paymentMethod").default("stripe").notNull(),
  paidAt: timestamp("paidAt"),
  paymentRecordedBy: integer("paymentRecordedBy").references(() => users.id),
  paymentDueDate: timestamp("paymentDueDate"),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerNotes: text("customerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  vacantShopIdIdx: index("vsb_vacantShopId_idx").on(table.vacantShopId),
  customerIdIdx: index("vsb_customerId_idx").on(table.customerId),
  startDateIdx: index("vsb_startDate_idx").on(table.startDate),
  statusIdx: index("vsb_status_idx").on(table.status),
  dateRangeIdx: index("vsb_date_range_idx").on(table.vacantShopId, table.startDate, table.endDate),
}));

/**
 * Third Line Income Bookings - Bookings for non-tenancy assets
 */
export const thirdLineBookings = pgTable("third_line_bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  thirdLineIncomeId: integer("thirdLineIncomeId").notNull().references(() => thirdLineIncome.id, { onDelete: "cascade" }),
  customerId: integer("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(),
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  approvedBy: integer("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paymentMethod: paymentMethodEnum("paymentMethod").default("stripe").notNull(),
  paidAt: timestamp("paidAt"),
  paymentRecordedBy: integer("paymentRecordedBy").references(() => users.id),
  paymentDueDate: timestamp("paymentDueDate"),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerNotes: text("customerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  thirdLineIncomeIdIdx: index("tlb_thirdLineIncomeId_idx").on(table.thirdLineIncomeId),
  customerIdIdx: index("tlb_customerId_idx").on(table.customerId),
  startDateIdx: index("tlb_startDate_idx").on(table.startDate),
  statusIdx: index("tlb_status_idx").on(table.status),
  dateRangeIdx: index("tlb_date_range_idx").on(table.thirdLineIncomeId, table.startDate, table.endDate),
}));

// =============================================================================
// Type Exports
// =============================================================================

export type ThirdLineCategory = typeof thirdLineCategories.$inferSelect;
export type InsertThirdLineCategory = typeof thirdLineCategories.$inferInsert;
export type VacantShop = typeof vacantShops.$inferSelect;
export type InsertVacantShop = typeof vacantShops.$inferInsert;
export type ThirdLineIncome = typeof thirdLineIncome.$inferSelect;
export type InsertThirdLineIncome = typeof thirdLineIncome.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = typeof customerProfiles.$inferInsert;
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = typeof owners.$inferInsert;
export type FloorLevel = typeof floorLevels.$inferSelect;
export type InsertFloorLevel = typeof floorLevels.$inferInsert;
export type ShoppingCentre = typeof shoppingCentres.$inferSelect;
export type InsertShoppingCentre = typeof shoppingCentres.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;
export type UsageType = typeof usageTypes.$inferSelect;
export type InsertUsageType = typeof usageTypes.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;
export type FyPercentages = typeof fyPercentages.$inferSelect;
export type InsertFyPercentages = typeof fyPercentages.$inferInsert;
export type CentreBudget = typeof centreBudgets.$inferSelect;
export type InsertCentreBudget = typeof centreBudgets.$inferInsert;
export type VacantShopBooking = typeof vacantShopBookings.$inferSelect;
export type InsertVacantShopBooking = typeof vacantShopBookings.$inferInsert;
export type ThirdLineBooking = typeof thirdLineBookings.$inferSelect;
export type InsertThirdLineBooking = typeof thirdLineBookings.$inferInsert;
export type FAQ = typeof faqs.$inferSelect;
export type InsertFAQ = typeof faqs.$inferInsert;
