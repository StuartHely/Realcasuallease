/**
 * Resolves the effective payment method for a booking based on the centre's
 * payment mode and the customer's invoice eligibility flag.
 *
 * Priority:
 * 1. invoice_only → always "invoice"
 * 2. stripe_with_exceptions + canPayByInvoice → "invoice"
 * 3. stripe → always "stripe" (ignores user flag)
 * 4. Otherwise → "stripe"
 */
export function resolvePaymentMethod(
  paymentMode: "stripe" | "stripe_with_exceptions" | "invoice_only",
  canPayByInvoice: boolean,
): "stripe" | "invoice" {
  if (paymentMode === "invoice_only") return "invoice";
  if (paymentMode === "stripe_with_exceptions" && canPayByInvoice) return "invoice";
  return "stripe";
}
