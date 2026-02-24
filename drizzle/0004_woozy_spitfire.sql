ALTER TABLE "shopping_centres" DROP CONSTRAINT "shopping_centres_centreCode_unique";--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "shopping_centres" ADD CONSTRAINT "shopping_centres_slug_unique" UNIQUE("slug");