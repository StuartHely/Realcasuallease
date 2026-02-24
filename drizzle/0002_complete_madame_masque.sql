ALTER TABLE "sites" ALTER COLUMN "pricePerDay" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "pricePerDay" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "pricePerWeek" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "pricePerWeek" DROP NOT NULL;