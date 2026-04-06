-- Change totalSizeM2 from decimal to varchar to accept text values like "TBA", "999 approx"
ALTER TABLE vacant_shops ALTER COLUMN "totalSizeM2" TYPE varchar(100) USING "totalSizeM2"::text;
