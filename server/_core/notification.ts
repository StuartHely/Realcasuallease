export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Legacy Replit Forge notification — replaced with no-op.
 * Owner notifications are handled via SMTP email (bookingNotifications.ts).
 * Always returns false so callers fall back to email.
 */
export async function notifyOwner(
  _payload: NotificationPayload
): Promise<boolean> {
  return false;
}
