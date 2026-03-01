CREATE TABLE "search_intent_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"queryHash" varchar(64) NOT NULL,
	"normalizedQuery" text NOT NULL,
	"parsedIntent" jsonb NOT NULL,
	"hitCount" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "search_intent_cache_queryHash_unique" UNIQUE("queryHash")
);
--> statement-breakpoint
ALTER TABLE "search_analytics" ADD COLUMN "parsedIntent" jsonb;--> statement-breakpoint
ALTER TABLE "search_analytics" ADD COLUMN "parserUsed" varchar(20);--> statement-breakpoint
ALTER TABLE "search_analytics" ADD COLUMN "topResultScore" integer;--> statement-breakpoint
CREATE INDEX "sic_queryHash_idx" ON "search_intent_cache" USING btree ("queryHash");