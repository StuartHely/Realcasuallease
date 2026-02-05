import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, bigint, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for the platform.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", [
    "customer",
    "owner_centre_manager",
    "owner_marketing_manager",
    "owner_regional_admin",
    "owner_state_admin",
    "owner_super_admin",
    "mega_state_admin",
    "mega_admin"
  ]).default("customer").notNull(),
  assignedState: varchar("assignedState", { length: 3 }), // For state_admin roles: NSW, VIC, QLD, etc.
  canPayByInvoice: boolean("canPayByInvoice").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Customer/Tenant profile with registration details
 */
export const customerProfiles = mysqlTable("customer_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

/**
 * Shopping centre owners/managers with bank details and fee configuration
 */
export const owners = mysqlTable("owners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  bankName: varchar("bankName", { length: 255 }),
  bankAccountName: varchar("bankAccountName", { length: 255 }),
  bankBsb: varchar("bankBsb", { length: 10 }),
  bankAccountNumber: varchar("bankAccountNumber", { length: 20 }),
  monthlyFee: decimal("monthlyFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  remittanceType: mysqlEnum("remittanceType", ["per_booking", "monthly"]).default("monthly").notNull(),
  invoiceEmail1: varchar("invoiceEmail1", { length: 320 }),
  invoiceEmail2: varchar("invoiceEmail2", { length: 320 }),
  invoiceEmail3: varchar("invoiceEmail3", { length: 320 }),
  remittanceEmail1: varchar("remittanceEmail1", { length: 320 }),
  remittanceEmail2: varchar("remittanceEmail2", { length: 320 }),
  remittanceEmail3: varchar("remittanceEmail3", { length: 320 }),
  remittanceEmail4: varchar("remittanceEmail4", { length: 320 }),
  remittanceEmail5: varchar("remittanceEmail5", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Floor levels for multi-level shopping centres
 */
export const floorLevels = mysqlTable("floor_levels", {
  id: int("id").autoincrement().primaryKey(),
  centreId: int("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  levelName: varchar("levelName", { length: 100 }).notNull(), // e.g., "Ground Floor", "Level 1", "Level 2"
  levelNumber: varchar("levelNumber", { length: 20 }).notNull(), // e.g., "G", "L1", "M", "Coles Level"
  mapImageUrl: text("mapImageUrl"),
  displayOrder: int("displayOrder").notNull(), // For custom ordering
  isHidden: boolean("isHidden").default(false).notNull(), // Soft delete - hide from public but preserve historical data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  centreIdIdx: index("centreId_idx").on(table.centreId),
}));

/**
 * Shopping centres
 */
export const shoppingCentres = mysqlTable("shopping_centres", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => owners.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  centreCode: varchar("centreCode", { length: 50 }).unique(),
  address: text("address"),
  suburb: varchar("suburb", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  postcode: varchar("postcode", { length: 10 }),
  description: text("description"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  majors: text("majors"),
  numberOfSpecialties: int("numberOfSpecialties"),
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
  weeklyReportNextOverrideDay: mysqlEnum("weeklyReportNextOverrideDay", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  includeInMainSite: boolean("includeInMainSite").default(true).notNull(),
  mapImageUrl: text("mapImageUrl"),
  totalTablesAvailable: int("totalTablesAvailable").default(0),
  totalChairsAvailable: int("totalChairsAvailable").default(0),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  ownerIdIdx: index("ownerId_idx").on(table.ownerId),
  nameIdx: index("name_idx").on(table.name),
}));

/**
 * Sites/Spaces within shopping centres
 */
export const sites = mysqlTable("sites", {
  id: int("id").autoincrement().primaryKey(),
  centreId: int("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  siteNumber: varchar("siteNumber", { length: 50 }).notNull(),
  description: text("description"),
  size: varchar("size", { length: 100 }),
  maxTables: int("maxTables"),
  powerAvailable: varchar("powerAvailable", { length: 100 }),
  restrictions: text("restrictions"),
  pricePerDay: decimal("pricePerDay", { precision: 10, scale: 2 }).default("150.00").notNull(),
  pricePerWeek: decimal("pricePerWeek", { precision: 10, scale: 2 }).default("750.00").notNull(),
  weekendPricePerDay: decimal("weekendPricePerDay", { precision: 10, scale: 2 }),
  instantBooking: boolean("instantBooking").default(true).notNull(),
  imageUrl1: text("imageUrl1"),
  imageUrl2: text("imageUrl2"),
  imageUrl3: text("imageUrl3"),
  imageUrl4: text("imageUrl4"),
  videoUrl: text("videoUrl"),
  floorLevelId: int("floorLevelId").references(() => floorLevels.id, { onDelete: "set null" }), // null for single-level centres
  mapMarkerX: decimal("mapMarkerX", { precision: 5, scale: 2 }),
  mapMarkerY: decimal("mapMarkerY", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  centreIdIdx: index("centreId_idx").on(table.centreId),
}));

/**
 * Usage categories for bookings (34 predefined categories)
 */
export const usageCategories = mysqlTable("usage_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isFree: boolean("isFree").default(false).notNull(), // true for "Charities (Free)" and "Government (Free)"
  displayOrder: int("displayOrder").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Junction table: which usage categories are approved for which sites
 */
export const siteUsageCategories = mysqlTable("site_usage_categories", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().references(() => sites.id, { onDelete: "cascade" }),
  categoryId: int("categoryId").notNull().references(() => usageCategories.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index("siteId_idx").on(table.siteId),
  categoryIdIdx: index("categoryId_idx").on(table.categoryId),
  uniqueSiteCategory: index("unique_site_category").on(table.siteId, table.categoryId),
}));

/**
 * Legacy usage types table (kept for backward compatibility)
 */
export const usageTypes = mysqlTable("usage_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Bookings
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  siteId: int("siteId").notNull().references(() => sites.id, { onDelete: "cascade" }),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  usageTypeId: int("usageTypeId").references(() => usageTypes.id),
  customUsage: text("customUsage"),
  usageCategoryId: int("usageCategoryId").references(() => usageCategories.id),
  additionalCategoryText: text("additionalCategoryText"), // triggers manual approval if filled
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(), // Store GST rate at time of booking/transaction
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "rejected"]).default("pending").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  tablesRequested: int("tablesRequested").default(0),
  chairsRequested: int("chairsRequested").default(0),
  bringingOwnTables: boolean("bringingOwnTables").default(false).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "invoice"]).default("stripe").notNull(),
  paidAt: timestamp("paidAt"),
  paymentRecordedBy: int("paymentRecordedBy").references(() => users.id),
  paymentDueDate: timestamp("paymentDueDate"), // For invoice bookings - when payment is due
  remindersSent: int("remindersSent").default(0).notNull(), // Count of payment reminders sent
  customerEmail: varchar("customerEmail", { length: 320 }),
  confirmationEmailSent: boolean("confirmationEmailSent").default(false).notNull(),
  reminderEmailSent: boolean("reminderEmailSent").default(false).notNull(),
  completionEmailSent: boolean("completionEmailSent").default(false).notNull(),
  lastReminderSent: timestamp("lastReminderSent"),
  adminComments: text("adminComments"), // Internal admin notes, never shown on invoices/emails
  createdByAdmin: int("createdByAdmin").references(() => users.id), // If booking was created by admin on behalf of user
  invoiceOverride: boolean("invoiceOverride").default(false).notNull(), // Override Stripe user to pay by invoice for this booking
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  siteIdIdx: index("siteId_idx").on(table.siteId),
  customerIdIdx: index("customerId_idx").on(table.customerId),
  startDateIdx: index("startDate_idx").on(table.startDate),
  statusIdx: index("status_idx").on(table.status),
  // Composite index for optimized date range queries in search
  siteIdDateRangeIdx: index("siteId_date_range_idx").on(table.siteId, table.startDate, table.endDate),
}));

/**
 * Booking status history for audit trail
 */
export const bookingStatusHistory = mysqlTable("booking_status_history", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  previousStatus: mysqlEnum("previousStatus", ["pending", "confirmed", "cancelled", "completed", "rejected"]),
  newStatus: mysqlEnum("newStatus", ["pending", "confirmed", "cancelled", "completed", "rejected"]).notNull(),
  changedBy: int("changedBy").references(() => users.id),
  changedByName: varchar("changedByName", { length: 255 }),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bookingIdIdx: index("booking_status_bookingId_idx").on(table.bookingId),
  createdAtIdx: index("booking_status_createdAt_idx").on(table.createdAt),
}));

/**
 * Financial transactions (including reversals for cancellations)
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => owners.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["booking", "cancellation", "monthly_fee"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(), // Store GST rate at time of booking/transaction
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  remitted: boolean("remitted").default(false).notNull(),
  remittedAt: timestamp("remittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bookingIdIdx: index("bookingId_idx").on(table.bookingId),
  ownerIdIdx: index("ownerId_idx").on(table.ownerId),
  remittedIdx: index("remitted_idx").on(table.remitted),
}));

/**
 * System configuration
 */
export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  imageQuality: int("image_quality").default(85),
  imageMaxWidth: int("image_max_width").default(1200),
  imageMaxHeight: int("image_max_height").default(800),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Image analytics tracking
 */
export const seasonalRates = mysqlTable("seasonalRates", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
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
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().references(() => sites.id, { onDelete: "cascade" }),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(), // e.g., 2026
  budgetAmount: decimal("budgetAmount", { precision: 12, scale: 2 }).notNull(), // Target revenue for this site/month
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  siteIdIdx: index("siteId_idx").on(table.siteId),
  monthYearIdx: index("month_year_idx").on(table.month, table.year),
  uniqueSiteMonthYear: index("unique_site_month_year").on(table.siteId, table.month, table.year),
}));

/**
 * Financial year monthly percentage distribution
 * Stores the percentage allocation for each month (July-June)
 */
export const fyPercentages = mysqlTable("fy_percentages", {
  id: int("id").autoincrement().primaryKey(),
  financialYear: int("financialYear").notNull(), // e.g., 2026 means FY 2025-26 (July 2025 - June 2026)
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  fyIdx: index("fy_idx").on(table.financialYear),
}));

/**
 * Centre annual budgets for financial year
 * Stores the total annual budget per centre
 */
export const centreBudgets = mysqlTable("centre_budgets", {
  id: int("id").autoincrement().primaryKey(),
  centreId: int("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  financialYear: int("financialYear").notNull(), // e.g., 2026 means FY 2025-26
  annualBudget: decimal("annualBudget", { precision: 14, scale: 2 }).notNull(), // Total annual budget for the centre
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  centreIdIdx: index("centreId_idx").on(table.centreId),
  fyIdx: index("fy_idx").on(table.financialYear),
  uniqueCentreFy: index("unique_centre_fy").on(table.centreId, table.financialYear),
}));

export const imageAnalytics = mysqlTable("imageAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("site_id").notNull().references(() => sites.id, { onDelete: 'cascade' }),
  imageSlot: int("image_slot").notNull(), // 1-4
  viewCount: int("view_count").default(0).notNull(),
  clickCount: int("click_count").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type InsertImageAnalytics = typeof imageAnalytics.$inferInsert;
export type SelectImageAnalytics = typeof imageAnalytics.$inferSelect;

/**
 * Search analytics for tracking user searches and suggestions
 */
export const searchAnalytics = mysqlTable("search_analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  query: text("query").notNull(),
  centreName: varchar("centreName", { length: 255 }),
  minSizeM2: decimal("minSizeM2", { precision: 10, scale: 2 }),
  productCategory: varchar("productCategory", { length: 255 }),
  resultsCount: int("resultsCount").notNull(),
  hadResults: boolean("hadResults").notNull(),
  suggestionsShown: int("suggestionsShown").default(0),
  suggestionClicked: boolean("suggestionClicked").default(false),
  clickedSuggestion: varchar("clickedSuggestion", { length: 255 }),
  searchDate: timestamp("searchDate").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  searchDateIdx: index("searchDate_idx").on(table.searchDate),
  hadResultsIdx: index("hadResults_idx").on(table.hadResults),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytics = typeof searchAnalytics.$inferInsert;

/**
 * Audit log for admin changes
 */
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  changes: text("changes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

/**
 * Third Line Income Categories (admin-managed)
 */
export const thirdLineCategories = mysqlTable("third_line_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  displayOrder: int("displayOrder").notNull().default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Vacant Shops - Short-term physical retail tenancies
 */
export const vacantShops = mysqlTable("vacant_shops", {
  id: int("id").autoincrement().primaryKey(),
  centreId: int("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  shopNumber: varchar("shopNumber", { length: 50 }).notNull(),
  totalSizeM2: decimal("totalSizeM2", { precision: 10, scale: 2 }), // Total size in square metres
  dimensions: varchar("dimensions", { length: 100 }), // e.g., "5m x 8m"
  powered: boolean("powered").default(false).notNull(),
  description: text("description"),
  imageUrl1: text("imageUrl1"),
  imageUrl2: text("imageUrl2"),
  pricePerWeek: decimal("pricePerWeek", { precision: 10, scale: 2 }),
  pricePerMonth: decimal("pricePerMonth", { precision: 10, scale: 2 }),
  floorLevelId: int("floorLevelId").references(() => floorLevels.id, { onDelete: "set null" }),
  mapMarkerX: decimal("mapMarkerX", { precision: 5, scale: 2 }),
  mapMarkerY: decimal("mapMarkerY", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  centreIdIdx: index("vs_centreId_idx").on(table.centreId),
  floorLevelIdIdx: index("vs_floorLevelId_idx").on(table.floorLevelId),
  isActiveIdx: index("vs_isActive_idx").on(table.isActive),
}));

/**
 * Third Line Income - Non-tenancy assets (vending, signage, etc.)
 */
export const thirdLineIncome = mysqlTable("third_line_income", {
  id: int("id").autoincrement().primaryKey(),
  centreId: int("centreId").notNull().references(() => shoppingCentres.id, { onDelete: "cascade" }),
  assetNumber: varchar("assetNumber", { length: 50 }).notNull(),
  categoryId: int("categoryId").notNull().references(() => thirdLineCategories.id, { onDelete: "restrict" }),
  dimensions: varchar("dimensions", { length: 100 }), // e.g., "1.5m x 0.8m"
  powered: boolean("powered").default(false).notNull(),
  description: text("description"),
  imageUrl1: text("imageUrl1"),
  imageUrl2: text("imageUrl2"),
  pricePerWeek: decimal("pricePerWeek", { precision: 10, scale: 2 }),
  pricePerMonth: decimal("pricePerMonth", { precision: 10, scale: 2 }),
  floorLevelId: int("floorLevelId").references(() => floorLevels.id, { onDelete: "set null" }),
  mapMarkerX: decimal("mapMarkerX", { precision: 5, scale: 2 }),
  mapMarkerY: decimal("mapMarkerY", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  centreIdIdx: index("tli_centreId_idx").on(table.centreId),
  categoryIdIdx: index("tli_categoryId_idx").on(table.categoryId),
  floorLevelIdIdx: index("tli_floorLevelId_idx").on(table.floorLevelId),
  isActiveIdx: index("tli_isActive_idx").on(table.isActive),
}));

// Type exports
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

/**
 * Vacant Shop Bookings - Bookings for short-term vacant shop tenancies
 */
export const vacantShopBookings = mysqlTable("vacant_shop_bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  vacantShopId: int("vacantShopId").notNull().references(() => vacantShops.id, { onDelete: "cascade" }),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(),
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "rejected"]).default("pending").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "invoice"]).default("stripe").notNull(),
  paidAt: timestamp("paidAt"),
  paymentRecordedBy: int("paymentRecordedBy").references(() => users.id),
  paymentDueDate: timestamp("paymentDueDate"),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerNotes: text("customerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const thirdLineBookings = mysqlTable("third_line_bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  thirdLineIncomeId: int("thirdLineIncomeId").notNull().references(() => thirdLineIncome.id, { onDelete: "cascade" }),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gstPercentage", { precision: 5, scale: 2 }).notNull(),
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "rejected"]).default("pending").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "invoice"]).default("stripe").notNull(),
  paidAt: timestamp("paidAt"),
  paymentRecordedBy: int("paymentRecordedBy").references(() => users.id),
  paymentDueDate: timestamp("paymentDueDate"),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerNotes: text("customerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  thirdLineIncomeIdIdx: index("tlb_thirdLineIncomeId_idx").on(table.thirdLineIncomeId),
  customerIdIdx: index("tlb_customerId_idx").on(table.customerId),
  startDateIdx: index("tlb_startDate_idx").on(table.startDate),
  statusIdx: index("tlb_status_idx").on(table.status),
  dateRangeIdx: index("tlb_date_range_idx").on(table.thirdLineIncomeId, table.startDate, table.endDate),
}));

export type VacantShopBooking = typeof vacantShopBookings.$inferSelect;
export type InsertVacantShopBooking = typeof vacantShopBookings.$inferInsert;
export type ThirdLineBooking = typeof thirdLineBookings.$inferSelect;
export type InsertThirdLineBooking = typeof thirdLineBookings.$inferInsert;
