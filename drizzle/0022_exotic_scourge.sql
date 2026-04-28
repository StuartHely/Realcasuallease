CREATE TABLE "historical_income" (
	"id" serial PRIMARY KEY NOT NULL,
	"centreId" integer NOT NULL,
	"assetType" varchar(30) NOT NULL,
	"assetId" integer,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"centreId" integer NOT NULL,
	"assetType" varchar(30) NOT NULL,
	"snapshotData" jsonb NOT NULL,
	"recordCount" integer NOT NULL,
	"importFileName" varchar(255),
	"createdBy" integer NOT NULL,
	"restoredAt" timestamp,
	"restoredBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historical_income" ADD CONSTRAINT "historical_income_centreId_shopping_centres_id_fk" FOREIGN KEY ("centreId") REFERENCES "public"."shopping_centres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_snapshots" ADD CONSTRAINT "import_snapshots_centreId_shopping_centres_id_fk" FOREIGN KEY ("centreId") REFERENCES "public"."shopping_centres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_snapshots" ADD CONSTRAINT "import_snapshots_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_snapshots" ADD CONSTRAINT "import_snapshots_restoredBy_users_id_fk" FOREIGN KEY ("restoredBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hi_centreId_idx" ON "historical_income" USING btree ("centreId");--> statement-breakpoint
CREATE INDEX "hi_assetType_idx" ON "historical_income" USING btree ("assetType");--> statement-breakpoint
CREATE INDEX "hi_month_year_idx" ON "historical_income" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "hi_unique_entry" ON "historical_income" USING btree ("centreId","assetType","assetId","month","year");--> statement-breakpoint
CREATE INDEX "is_centre_asset_idx" ON "import_snapshots" USING btree ("centreId","assetType");