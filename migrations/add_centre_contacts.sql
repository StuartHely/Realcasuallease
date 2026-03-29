ALTER TABLE "shopping_centres" ADD COLUMN IF NOT EXISTS "contactName" varchar(255);
ALTER TABLE "shopping_centres" ADD COLUMN IF NOT EXISTS "contactEmail" varchar(320);
ALTER TABLE "shopping_centres" ADD COLUMN IF NOT EXISTS "contactPhone" varchar(20);
