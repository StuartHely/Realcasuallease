-- Add username/password authentication columns to users table
-- Run this migration to enable local authentication alongside OAuth

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(64) UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255);

-- Create index for faster username lookups during login
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");
