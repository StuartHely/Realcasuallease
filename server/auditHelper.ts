import { getDb } from "./db";
import { auditLog } from "../drizzle/schema";

/**
 * Write an entry to the audit log. Never throws — errors are silently logged.
 * Use this instead of scattered `db.insert(auditLog)` calls.
 */
export async function writeAudit(entry: {
  userId?: number | null;
  action: string;
  entityType?: string;
  entityId?: number;
  changes?: Record<string, unknown> | string;
  ipAddress?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(auditLog).values({
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      changes: typeof entry.changes === "string"
        ? entry.changes
        : entry.changes
          ? JSON.stringify(entry.changes)
          : null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[writeAudit] Failed to write audit log:", err);
  }
}
