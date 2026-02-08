CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('stripe', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."remittance_type" AS ENUM('per_booking', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('customer', 'owner_centre_manager', 'owner_marketing_manager', 'owner_regional_admin', 'owner_state_admin', 'owner_super_admin', 'mega_state_admin', 'mega_admin');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('booking', 'cancellation', 'monthly_fee');--> statement-breakpoint
CREATE TYPE "public"."weekday" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(255) NOT NULL,
	"entityType" varchar(100),
	"entityId" integer,
	"changes" text,
	"ipAddress" varchar(45),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingId" integer NOT NULL,
	"previousStatus" "booking_status",
	"newStatus" "booking_status" NOT NULL,
	"changedBy" integer,
	"changedByName" varchar(255),
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingNumber" varchar(50) NOT NULL,
	"siteId" integer NOT NULL,
	"customerId" integer NOT NULL,
	"usageTypeId" integer,
	"customUsage" text,
	"usageCategoryId" integer,
	"additionalCategoryText" text,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"totalAmount" numeric(12, 2) NOT NULL,
	"gstAmount" numeric(12, 2) NOT NULL,
	"gstPercentage" numeric(5, 2) NOT NULL,
	"ownerAmount" numeric(12, 2) NOT NULL,
	"platformFee" numeric(12, 2) NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"requiresApproval" boolean DEFAULT false NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectionReason" text,
	"tablesRequested" integer DEFAULT 0,
	"chairsRequested" integer DEFAULT 0,
	"bringingOwnTables" boolean DEFAULT false NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"paymentMethod" "payment_method" DEFAULT 'stripe' NOT NULL,
	"paidAt" timestamp,
	"paymentRecordedBy" integer,
	"paymentDueDate" timestamp,
	"remindersSent" integer DEFAULT 0 NOT NULL,
	"customerEmail" varchar(320),
	"confirmationEmailSent" boolean DEFAULT false NOT NULL,
	"reminderEmailSent" boolean DEFAULT false NOT NULL,
	"completionEmailSent" boolean DEFAULT false NOT NULL,
	"lastReminderSent" timestamp,
	"adminComments" text,
	"createdByAdmin" integer,
	"invoiceOverride" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_bookingNumber_unique" UNIQUE("bookingNumber")
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"siteId" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"budgetAmount" numeric(12, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "centre_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"centreId" integer NOT NULL,
	"financialYear" integer NOT NULL,
	"annualBudget" numeric(14, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"firstName" varchar(100),
	"lastName" varchar(100),
	"phone" varchar(20),
	"companyName" varchar(255),
	"tradingName" varchar(255),
	"website" varchar(255),
	"abn" varchar(11),
	"streetAddress" text,
	"city" varchar(100),
	"state" varchar(50),
	"postcode" varchar(10),
	"productCategory" varchar(255),
	"productDetails" text,
	"insuranceCompany" varchar(255),
	"insurancePolicyNo" varchar(100),
	"insuranceAmount" numeric(12, 2),
	"insuranceExpiry" timestamp,
	"insuranceDocumentUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"centreId" integer NOT NULL,
	"levelName" varchar(100) NOT NULL,
	"levelNumber" varchar(20) NOT NULL,
	"mapImageUrl" text,
	"displayOrder" integer NOT NULL,
	"isHidden" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fy_percentages" (
	"id" serial PRIMARY KEY NOT NULL,
	"financialYear" integer NOT NULL,
	"july" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"august" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"september" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"october" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"november" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"december" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"january" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"february" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"march" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"april" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"may" numeric(5, 2) DEFAULT '8.33' NOT NULL,
	"june" numeric(5, 2) DEFAULT '8.37' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imageAnalytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"image_slot" integer NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp,
	"last_clicked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320),
	"phone" varchar(20),
	"bankName" varchar(255),
	"bankAccountName" varchar(255),
	"bankBsb" varchar(10),
	"bankAccountNumber" varchar(20),
	"monthlyFee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"commissionPercentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"remittanceType" "remittance_type" DEFAULT 'monthly' NOT NULL,
	"invoiceEmail1" varchar(320),
	"invoiceEmail2" varchar(320),
	"invoiceEmail3" varchar(320),
	"remittanceEmail1" varchar(320),
	"remittanceEmail2" varchar(320),
	"remittanceEmail3" varchar(320),
	"remittanceEmail4" varchar(320),
	"remittanceEmail5" varchar(320),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"query" text NOT NULL,
	"centreName" varchar(255),
	"minSizeM2" numeric(10, 2),
	"productCategory" varchar(255),
	"resultsCount" integer NOT NULL,
	"hadResults" boolean NOT NULL,
	"suggestionsShown" integer DEFAULT 0,
	"suggestionClicked" boolean DEFAULT false,
	"clickedSuggestion" varchar(255),
	"searchDate" timestamp NOT NULL,
	"ipAddress" varchar(45),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasonalRates" (
	"id" serial PRIMARY KEY NOT NULL,
	"siteId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"startDate" varchar(10) NOT NULL,
	"endDate" varchar(10) NOT NULL,
	"weekdayRate" numeric(10, 2),
	"weekendRate" numeric(10, 2),
	"weeklyRate" numeric(10, 2),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopping_centres" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"centreCode" varchar(50),
	"address" text,
	"suburb" varchar(100),
	"city" varchar(100),
	"state" varchar(50),
	"postcode" varchar(10),
	"description" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"majors" text,
	"numberOfSpecialties" integer,
	"weeklyReportEmail1" varchar(320),
	"weeklyReportEmail2" varchar(320),
	"weeklyReportEmail3" varchar(320),
	"weeklyReportEmail4" varchar(320),
	"weeklyReportEmail5" varchar(320),
	"weeklyReportEmail6" varchar(320),
	"weeklyReportEmail7" varchar(320),
	"weeklyReportEmail8" varchar(320),
	"weeklyReportEmail9" varchar(320),
	"weeklyReportEmail10" varchar(320),
	"weeklyReportTimezone" varchar(50) DEFAULT 'Australia/Sydney',
	"weeklyReportNextOverrideDay" "weekday",
	"includeInMainSite" boolean DEFAULT true NOT NULL,
	"mapImageUrl" text,
	"totalTablesAvailable" integer DEFAULT 0,
	"totalChairsAvailable" integer DEFAULT 0,
	"contactPhone" varchar(20),
	"contactEmail" varchar(320),
	"operatingHours" text,
	"policies" text,
	"pdfUrl1" text,
	"pdfName1" varchar(255),
	"pdfUrl2" text,
	"pdfName2" varchar(255),
	"pdfUrl3" text,
	"pdfName3" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_centres_centreCode_unique" UNIQUE("centreCode")
);
--> statement-breakpoint
CREATE TABLE "site_usage_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"siteId" integer NOT NULL,
	"categoryId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"centreId" integer NOT NULL,
	"siteNumber" varchar(50) NOT NULL,
	"description" text,
	"size" varchar(100),
	"maxTables" integer,
	"powerAvailable" varchar(100),
	"restrictions" text,
	"pricePerDay" numeric(10, 2) DEFAULT '150.00' NOT NULL,
	"pricePerWeek" numeric(10, 2) DEFAULT '750.00' NOT NULL,
	"weekendPricePerDay" numeric(10, 2),
	"instantBooking" boolean DEFAULT true NOT NULL,
	"imageUrl1" text,
	"imageUrl2" text,
	"imageUrl3" text,
	"imageUrl4" text,
	"videoUrl" text,
	"floorLevelId" integer,
	"mapMarkerX" numeric(5, 2),
	"mapMarkerY" numeric(5, 2),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"image_quality" integer DEFAULT 85,
	"image_max_width" integer DEFAULT 1200,
	"image_max_height" integer DEFAULT 800,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "third_line_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingNumber" varchar(50) NOT NULL,
	"thirdLineIncomeId" integer NOT NULL,
	"customerId" integer NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"totalAmount" numeric(12, 2) NOT NULL,
	"gstAmount" numeric(12, 2) NOT NULL,
	"gstPercentage" numeric(5, 2) NOT NULL,
	"ownerAmount" numeric(12, 2) NOT NULL,
	"platformFee" numeric(12, 2) NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"requiresApproval" boolean DEFAULT false NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectionReason" text,
	"stripePaymentIntentId" varchar(255),
	"paymentMethod" "payment_method" DEFAULT 'stripe' NOT NULL,
	"paidAt" timestamp,
	"paymentRecordedBy" integer,
	"paymentDueDate" timestamp,
	"customerEmail" varchar(320),
	"customerNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "third_line_bookings_bookingNumber_unique" UNIQUE("bookingNumber")
);
--> statement-breakpoint
CREATE TABLE "third_line_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "third_line_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "third_line_income" (
	"id" serial PRIMARY KEY NOT NULL,
	"centreId" integer NOT NULL,
	"assetNumber" varchar(50) NOT NULL,
	"categoryId" integer NOT NULL,
	"dimensions" varchar(100),
	"powered" boolean DEFAULT false NOT NULL,
	"description" text,
	"imageUrl1" text,
	"imageUrl2" text,
	"pricePerWeek" numeric(10, 2),
	"pricePerMonth" numeric(10, 2),
	"floorLevelId" integer,
	"mapMarkerX" numeric(5, 2),
	"mapMarkerY" numeric(5, 2),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingId" integer NOT NULL,
	"ownerId" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"gstAmount" numeric(12, 2) NOT NULL,
	"gstPercentage" numeric(5, 2) NOT NULL,
	"ownerAmount" numeric(12, 2) NOT NULL,
	"platformFee" numeric(12, 2) NOT NULL,
	"remitted" boolean DEFAULT false NOT NULL,
	"remittedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"isFree" boolean DEFAULT false NOT NULL,
	"displayOrder" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "usage_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"requiresApproval" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'customer' NOT NULL,
	"assignedState" varchar(3),
	"canPayByInvoice" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vacant_shop_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingNumber" varchar(50) NOT NULL,
	"vacantShopId" integer NOT NULL,
	"customerId" integer NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"totalAmount" numeric(12, 2) NOT NULL,
	"gstAmount" numeric(12, 2) NOT NULL,
	"gstPercentage" numeric(5, 2) NOT NULL,
	"ownerAmount" numeric(12, 2) NOT NULL,
	"platformFee" numeric(12, 2) NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"requiresApproval" boolean DEFAULT false NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectionReason" text,
	"stripePaymentIntentId" varchar(255),
	"paymentMethod" "payment_method" DEFAULT 'stripe' NOT NULL,
	"paidAt" timestamp,
	"paymentRecordedBy" integer,
	"paymentDueDate" timestamp,
	"customerEmail" varchar(320),
	"customerNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vacant_shop_bookings_bookingNumber_unique" UNIQUE("bookingNumber")
);
--> statement-breakpoint
CREATE TABLE "vacant_shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"centreId" integer NOT NULL,
	"shopNumber" varchar(50) NOT NULL,
	"totalSizeM2" numeric(10, 2),
	"dimensions" varchar(100),
	"powered" boolean DEFAULT false NOT NULL,
	"description" text,
	"imageUrl1" text,
	"imageUrl2" text,
	"pricePerWeek" numeric(10, 2),
	"pricePerMonth" numeric(10, 2),
	"floorLevelId" integer,
	"mapMarkerX" numeric(5, 2),
	"mapMarkerY" numeric(5, 2),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_bookings_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changedBy_users_id_fk" FOREIGN KEY ("changedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_siteId_sites_id_fk" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_users_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_usageTypeId_usage_types_id_fk" FOREIGN KEY ("usageTypeId") REFERENCES "public"."usage_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_usageCategoryId_usage_categories_id_fk" FOREIGN KEY ("usageCategoryId") REFERENCES "public"."usage_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_paymentRecordedBy_users_id_fk" FOREIGN KEY ("paymentRecordedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_createdByAdmin_users_id_fk" FOREIGN KEY ("createdByAdmin") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_siteId_sites_id_fk" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centre_budgets" ADD CONSTRAINT "centre_budgets_centreId_shopping_centres_id_fk" FOREIGN KEY ("centreId") REFERENCES "public"."shopping_centres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_levels" ADD CONSTRAINT "floor_levels_centreId_shopping_centres_id_fk" FOREIGN KEY ("centreId") REFERENCES "public"."shopping_centres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imageAnalytics" ADD CONSTRAINT "imageAnalytics_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_analytics" ADD CONSTRAINT "search_analytics_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD CONSTRAINT "shopping_centres_ownerId_owners_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_usage_categories" ADD CONSTRAINT "site_usage_categories_siteId_sites_id_fk" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_usage_categories" ADD CONSTRAINT "site_usage_categories_categoryId_usage_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."usage_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_centreId_shopping_centres_id_fk" FOREIGN KEY ("centreId") REFERENCES "public"."shopping_centres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_floorLevelId_floor_levels_id_fk" FOREIGN KEY ("floorLevelId") REFERENCES "public"."floor_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD CONSTRAINT "third_line_bookings_thirdLineIncomeId_third_line_income_id_fk" FOREIGN KEY ("thirdLineIncomeId") REFERENCES "public"."third_line_income"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD CONSTRAINT "third_line_bookings_customerId_users_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD CONSTRAINT "third_line_bookings_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD CONSTRAINT "third_line_bookings_paymentRecordedBy_users_id_fk" FOREIGN KEY ("paymentRecordedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_line_income" ADD CONSTRAINT "third_line_income_centreId_shopping_centres_id_fk" FOREIGN KEY ("centreId") REFERENCES "public"."shopping_centres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_line_income" ADD CONSTRAINT "third_line_income_categoryId_third_line_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."third_line_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_line_income" ADD CONSTRAINT "third_line_income_floorLevelId_floor_levels_id_fk" FOREIGN KEY ("floorLevelId") REFERENCES "public"."floor_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bookingId_bookings_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ownerId_owners_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD CONSTRAINT "vacant_shop_bookings_vacantShopId_vacant_shops_id_fk" FOREIGN KEY ("vacantShopId") REFERENCES "public"."vacant_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD CONSTRAINT "vacant_shop_bookings_customerId_users_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD CONSTRAINT "vacant_shop_bookings_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD CONSTRAINT "vacant_shop_bookings_paymentRecordedBy_users_id_fk" FOREIGN KEY ("paymentRecordedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacant_shops" ADD CONSTRAINT "vacant_shops_centreId_shopping_centres_id_fk" FOREIGN KEY ("centreId") REFERENCES "public"."shopping_centres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacant_shops" ADD CONSTRAINT "vacant_shops_floorLevelId_floor_levels_id_fk" FOREIGN KEY ("floorLevelId") REFERENCES "public"."floor_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "al_userId_idx" ON "audit_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "al_createdAt_idx" ON "audit_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "bsh_bookingId_idx" ON "booking_status_history" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "bsh_createdAt_idx" ON "booking_status_history" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "booking_siteId_idx" ON "bookings" USING btree ("siteId");--> statement-breakpoint
CREATE INDEX "booking_customerId_idx" ON "bookings" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "booking_startDate_idx" ON "bookings" USING btree ("startDate");--> statement-breakpoint
CREATE INDEX "booking_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_siteId_date_range_idx" ON "bookings" USING btree ("siteId","startDate","endDate");--> statement-breakpoint
CREATE INDEX "budget_siteId_idx" ON "budgets" USING btree ("siteId");--> statement-breakpoint
CREATE INDEX "budget_month_year_idx" ON "budgets" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "budget_unique_site_month_year" ON "budgets" USING btree ("siteId","month","year");--> statement-breakpoint
CREATE INDEX "cb_centreId_idx" ON "centre_budgets" USING btree ("centreId");--> statement-breakpoint
CREATE INDEX "cb_fy_idx" ON "centre_budgets" USING btree ("financialYear");--> statement-breakpoint
CREATE INDEX "cb_unique_centre_fy" ON "centre_budgets" USING btree ("centreId","financialYear");--> statement-breakpoint
CREATE INDEX "userId_idx" ON "customer_profiles" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "floor_centreId_idx" ON "floor_levels" USING btree ("centreId");--> statement-breakpoint
CREATE INDEX "fyp_fy_idx" ON "fy_percentages" USING btree ("financialYear");--> statement-breakpoint
CREATE INDEX "sa_searchDate_idx" ON "search_analytics" USING btree ("searchDate");--> statement-breakpoint
CREATE INDEX "sa_hadResults_idx" ON "search_analytics" USING btree ("hadResults");--> statement-breakpoint
CREATE INDEX "sa_createdAt_idx" ON "search_analytics" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "centre_ownerId_idx" ON "shopping_centres" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "centre_name_idx" ON "shopping_centres" USING btree ("name");--> statement-breakpoint
CREATE INDEX "suc_siteId_idx" ON "site_usage_categories" USING btree ("siteId");--> statement-breakpoint
CREATE INDEX "suc_categoryId_idx" ON "site_usage_categories" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "suc_unique_site_category" ON "site_usage_categories" USING btree ("siteId","categoryId");--> statement-breakpoint
CREATE INDEX "site_centreId_idx" ON "sites" USING btree ("centreId");--> statement-breakpoint
CREATE INDEX "tlb_thirdLineIncomeId_idx" ON "third_line_bookings" USING btree ("thirdLineIncomeId");--> statement-breakpoint
CREATE INDEX "tlb_customerId_idx" ON "third_line_bookings" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "tlb_startDate_idx" ON "third_line_bookings" USING btree ("startDate");--> statement-breakpoint
CREATE INDEX "tlb_status_idx" ON "third_line_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tlb_date_range_idx" ON "third_line_bookings" USING btree ("thirdLineIncomeId","startDate","endDate");--> statement-breakpoint
CREATE INDEX "tli_centreId_idx" ON "third_line_income" USING btree ("centreId");--> statement-breakpoint
CREATE INDEX "tli_categoryId_idx" ON "third_line_income" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "tli_floorLevelId_idx" ON "third_line_income" USING btree ("floorLevelId");--> statement-breakpoint
CREATE INDEX "tli_isActive_idx" ON "third_line_income" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "tx_bookingId_idx" ON "transactions" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "tx_ownerId_idx" ON "transactions" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "tx_remitted_idx" ON "transactions" USING btree ("remitted");--> statement-breakpoint
CREATE INDEX "vsb_vacantShopId_idx" ON "vacant_shop_bookings" USING btree ("vacantShopId");--> statement-breakpoint
CREATE INDEX "vsb_customerId_idx" ON "vacant_shop_bookings" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "vsb_startDate_idx" ON "vacant_shop_bookings" USING btree ("startDate");--> statement-breakpoint
CREATE INDEX "vsb_status_idx" ON "vacant_shop_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vsb_date_range_idx" ON "vacant_shop_bookings" USING btree ("vacantShopId","startDate","endDate");--> statement-breakpoint
CREATE INDEX "vs_centreId_idx" ON "vacant_shops" USING btree ("centreId");--> statement-breakpoint
CREATE INDEX "vs_floorLevelId_idx" ON "vacant_shops" USING btree ("floorLevelId");--> statement-breakpoint
CREATE INDEX "vs_isActive_idx" ON "vacant_shops" USING btree ("isActive");