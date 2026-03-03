ALTER TABLE "bookings" ADD COLUMN "cancelledAt" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refundStatus" varchar(50);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refundPendingAt" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "gstAdjustmentNoteNumber" varchar(50);