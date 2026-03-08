ALTER TABLE "bookings" ADD COLUMN "licenceSignatureToken" varchar(64);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "licenceSignedAt" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "licenceSignedByName" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "licenceSignedByIp" varchar(45);--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignatureToken" varchar(64);--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignedAt" timestamp;--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignedByName" varchar(255);--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignedByIp" varchar(45);--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignatureToken" varchar(64);--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignedAt" timestamp;--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignedByName" varchar(255);--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignedByIp" varchar(45);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_licenceSignatureToken_unique" UNIQUE("licenceSignatureToken");--> statement-breakpoint
ALTER TABLE "third_line_bookings" ADD CONSTRAINT "third_line_bookings_licenceSignatureToken_unique" UNIQUE("licenceSignatureToken");--> statement-breakpoint
ALTER TABLE "vacant_shop_bookings" ADD CONSTRAINT "vacant_shop_bookings_licenceSignatureToken_unique" UNIQUE("licenceSignatureToken");