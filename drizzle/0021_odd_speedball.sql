CREATE TABLE "receipt_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingId" integer NOT NULL,
	"receiptNumber" varchar(50) NOT NULL,
	"sentBy" integer NOT NULL,
	"recipientEmails" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_sends_receiptNumber_unique" UNIQUE("receiptNumber")
);
--> statement-breakpoint
ALTER TABLE "vacant_shops" ALTER COLUMN "totalSizeM2" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "receipt_sends" ADD CONSTRAINT "receipt_sends_bookingId_bookings_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_sends" ADD CONSTRAINT "receipt_sends_sentBy_users_id_fk" FOREIGN KEY ("sentBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rs_bookingId_idx" ON "receipt_sends" USING btree ("bookingId");