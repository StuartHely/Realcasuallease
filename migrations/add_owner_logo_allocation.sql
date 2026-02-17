-- Migration: Add owner logo allocation
-- Created: 2024-02-16
-- Description: Add allocated_logo_id field to users table for owner-specific logos

-- Add allocated_logo_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS allocated_logo_id VARCHAR(20);

-- Add comment
COMMENT ON COLUMN users.allocated_logo_id IS 'Logo allocated to this owner (logo_1, logo_2, etc.) - only used for owner roles';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_allocated_logo ON users(allocated_logo_id) WHERE allocated_logo_id IS NOT NULL;

-- Example: Allocate Logo 1 to a specific owner (replace 123 with actual owner user ID)
-- UPDATE users SET allocated_logo_id = 'logo_1' WHERE id = 123 AND role LIKE 'owner_%';
