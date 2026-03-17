CREATE TABLE "eft_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"eftDepositId" integer NOT NULL,
	"bookingId" integer NOT NULL,
	"bookingType" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eft_deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"depositAmount" numeric(12, 2) NOT NULL,
	"depositDate" timestamp NOT NULL,
	"bankReference" varchar(255),
	"depositorName" varchar(255),
	"notes" text,
	"allocatedAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unallocatedAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"recordedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD COLUMN "amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "eft_allocations" ADD CONSTRAINT "eft_allocations_eftDepositId_eft_deposits_id_fk" FOREIGN KEY ("eftDepositId") REFERENCES "public"."eft_deposits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_deposits" ADD CONSTRAINT "eft_deposits_recordedBy_users_id_fk" FOREIGN KEY ("recordedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ea_eftDepositId_idx" ON "eft_allocations" USING btree ("eftDepositId");--> statement-breakpoint
CREATE INDEX "ea_booking_idx" ON "eft_allocations" USING btree ("bookingId","bookingType");