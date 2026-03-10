CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"message" text NOT NULL,
	"userId" integer,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"sslProvisioned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_domains_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "brandName" varchar(255);--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "brandLogoUrl" text;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "brandPrimaryColor" varchar(7);--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "brandAccentColor" varchar(7);--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "brandFaviconUrl" text;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "brandFooterText" text;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "supportEmail" varchar(320);--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN "supportPhone" varchar(20);--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_ownerId_owners_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_createdAt_idx" ON "feedback" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "td_ownerId_idx" ON "tenant_domains" USING btree ("ownerId");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;