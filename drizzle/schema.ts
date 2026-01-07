import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, bigint, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for the platform.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
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
  website: varchar("website", { length: 255 }),
  abn: varchar("abn", { length: 11 }),
  streetAddress: text("streetAddress"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  postcode: varchar("postcode", { length: 10 }),
  productCategory: varchar("productCategory", { length: 255 }),
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
  levelNumber: int("levelNumber").notNull(), // 0 for ground, 1 for level 1, etc.
  mapImageUrl: text("mapImageUrl"),
  displayOrder: int("displayOrder").notNull(), // For custom ordering
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
  includeInMainSite: boolean("includeInMainSite").default(true).notNull(),
  mapImageUrl: text("mapImageUrl"),
  totalTablesAvailable: int("totalTablesAvailable").default(0),
  totalChairsAvailable: int("totalChairsAvailable").default(0),
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
  mapMarkerX: int("mapMarkerX"),
  mapMarkerY: int("mapMarkerY"),
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
  ownerAmount: decimal("ownerAmount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "rejected"]).default("pending").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  tablesRequested: int("tablesRequested").default(0),
  chairsRequested: int("chairsRequested").default(0),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  confirmationEmailSent: boolean("confirmationEmailSent").default(false).notNull(),
  reminderEmailSent: boolean("reminderEmailSent").default(false).notNull(),
  completionEmailSent: boolean("completionEmailSent").default(false).notNull(),
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
 * Financial transactions (including reversals for cancellations)
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => owners.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["booking", "cancellation", "monthly_fee"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull(),
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

// Type exports
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
