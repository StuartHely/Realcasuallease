-- Make audit_log.userId nullable to support system-generated events
ALTER TABLE audit_log ALTER COLUMN "userId" DROP NOT NULL;

-- Preserve audit history when users are deleted (set null instead of cascade)
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS "audit_log_userId_users_id_fk";
ALTER TABLE audit_log ADD CONSTRAINT "audit_log_userId_users_id_fk"
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
