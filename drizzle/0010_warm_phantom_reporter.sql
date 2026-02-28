CREATE TYPE "public"."payment_mode" AS ENUM('stripe', 'stripe_with_exceptions', 'invoice_only');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'owner_viewer' BEFORE 'owner_centre_manager';--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"bankBsb" varchar(10),
	"bankAccountNumber" varchar(20),
	"bankAccountName" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "invoiceDispatchedAt" timestamp;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "isAgency" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "parentAgencyId" integer;--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD COLUMN "portfolioId" integer;--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD COLUMN "paymentMode" "payment_mode" DEFAULT 'stripe_with_exceptions' NOT NULL;--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD COLUMN "bankBsb" varchar(10);--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD COLUMN "bankAccountNumber" varchar(20);--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD COLUMN "bankAccountName" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "assignedOwnerId" integer;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_ownerId_owners_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_ownerId_idx" ON "portfolios" USING btree ("ownerId");--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_parentAgencyId_owners_id_fk" FOREIGN KEY ("parentAgencyId") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD CONSTRAINT "shopping_centres_portfolioId_portfolios_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_assignedOwnerId_owners_id_fk" FOREIGN KEY ("assignedOwnerId") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "centre_portfolioId_idx" ON "shopping_centres" USING btree ("portfolioId");--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "invoiceOverride";