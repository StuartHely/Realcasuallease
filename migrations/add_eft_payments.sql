-- Migration: Add EFT payment tracking
-- Created: 2026-03-13
-- Description: Create eft_deposits and eft_allocations tables, add amountPaid to booking tables

-- 1. Create eft_deposits table
CREATE TABLE IF NOT EXISTS eft_deposits (
  id SERIAL PRIMARY KEY,
  "depositAmount" DECIMAL(12,2) NOT NULL,
  "depositDate" DATE NOT NULL,
  "bankReference" VARCHAR(255),
  "depositorName" VARCHAR(255),
  notes TEXT,
  "allocatedAmount" DECIMAL(12,2) DEFAULT 0,
  "unallocatedAmount" DECIMAL(12,2) DEFAULT 0,
  "recordedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 2. Create eft_allocations table
CREATE TABLE IF NOT EXISTS eft_allocations (
  id SERIAL PRIMARY KEY,
  "eftDepositId" INTEGER NOT NULL REFERENCES eft_deposits(id) ON DELETE CASCADE,
  "bookingId" INTEGER NOT NULL,
  "bookingType" VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Add constraint for bookingType values
DO $$ BEGIN
  ALTER TABLE eft_allocations
    ADD CONSTRAINT eft_allocations_booking_type_check
    CHECK ("bookingType" IN ('cl', 'vs', 'tli'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes on eft_allocations
CREATE INDEX IF NOT EXISTS idx_eft_allocations_deposit ON eft_allocations("eftDepositId");
CREATE INDEX IF NOT EXISTS idx_eft_allocations_booking ON eft_allocations("bookingId", "bookingType");

-- 3. Add amountPaid column to booking tables
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE vacant_shop_bookings
  ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE third_line_bookings
  ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;
