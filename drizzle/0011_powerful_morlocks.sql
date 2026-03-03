ALTER TABLE "owners" ADD COLUMN IF NOT EXISTS "commissionCl" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN IF NOT EXISTS "commissionVs" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN IF NOT EXISTS "commissionTli" numeric(5, 2);
