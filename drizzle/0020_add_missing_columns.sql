-- Catch-up migration for columns added by manual SQL files not tracked in the drizzle journal.
-- All use IF NOT EXISTS so this is safe to run even if columns already exist.

-- From 0001_add_password_auth.sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(64) UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255);
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");

-- From 0016_add_licence_signing.sql
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignatureToken" varchar(64) UNIQUE;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedAt" timestamp;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByName" varchar(255);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByIp" varchar(45);

ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignatureToken" varchar(64) UNIQUE;
ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedAt" timestamp;
ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByName" varchar(255);
ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByIp" varchar(45);

ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignatureToken" varchar(64) UNIQUE;
ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedAt" timestamp;
ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByName" varchar(255);
ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByIp" varchar(45);

-- From 0015_backfill_vs_tli_commission.sql
UPDATE owners SET "commissionVs" = '0.00' WHERE "commissionVs" IS NULL;
UPDATE owners SET "commissionTli" = '0.00' WHERE "commissionTli" IS NULL;
