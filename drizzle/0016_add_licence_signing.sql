-- Add licence signing columns to bookings
ALTER TABLE "bookings" ADD COLUMN "licenceSignatureToken" varchar(64) UNIQUE;
ALTER TABLE "bookings" ADD COLUMN "licenceSignedAt" timestamp;
ALTER TABLE "bookings" ADD COLUMN "licenceSignedByName" varchar(255);
ALTER TABLE "bookings" ADD COLUMN "licenceSignedByIp" varchar(45);

-- Add licence signing columns to vacant_shop_bookings
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignatureToken" varchar(64) UNIQUE;
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignedAt" timestamp;
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignedByName" varchar(255);
ALTER TABLE "vacant_shop_bookings" ADD COLUMN "licenceSignedByIp" varchar(45);

-- Add licence signing columns to third_line_bookings
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignatureToken" varchar(64) UNIQUE;
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignedAt" timestamp;
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignedByName" varchar(255);
ALTER TABLE "third_line_bookings" ADD COLUMN "licenceSignedByIp" varchar(45);
