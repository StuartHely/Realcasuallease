-- Make audit_log.userId nullable to support system-generated events
ALTER TABLE audit_log ALTER COLUMN "userId" DROP NOT NULL;
