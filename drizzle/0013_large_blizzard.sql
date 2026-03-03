ALTER TABLE "third_line_bookings" ADD COLUMN "cancelledAt" timestamp;--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD COLUMN "refundStatus" varchar(50);--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD COLUMN "refundPendingAt" timestamp;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "cancelledAt" timestamp;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "refundStatus" varchar(50);--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "refundPendingAt" timestamp;