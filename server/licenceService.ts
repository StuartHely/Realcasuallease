import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { bookings, vacantShopBookings, thirdLineBookings, auditLog } from "../drizzle/schema";

export type AssetType = "cl" | "vs" | "tli";

export interface LicenceStatus {
  token: string | null;
  signedAt: Date | null;
  signedByName: string | null;
  signedByIp: string | null;
}

export interface BookingForSigning {
  id: number;
  bookingNumber: string;
  assetType: AssetType;
  customerId: number;
  startDate: Date;
  endDate: Date;
  totalAmount: string;
  gstAmount: string;
  status: string;
  licenceSignedAt: Date | null;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Assign a licence signing token to a booking.
 * If the booking already has a token, returns the existing one.
 */
export async function assignLicenceToken(
  bookingId: number,
  assetType: AssetType,
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const table =
    assetType === "cl"
      ? bookings
      : assetType === "vs"
        ? vacantShopBookings
        : thirdLineBookings;

  // Check if already has a token
  const [existing] = await db
    .select({ token: table.licenceSignatureToken })
    .from(table)
    .where(eq(table.id, bookingId));

  if (existing?.token) return existing.token;

  const token = generateToken();
  await db
    .update(table)
    .set({ licenceSignatureToken: token })
    .where(eq(table.id, bookingId));

  return token;
}

/**
 * Find a booking by its licence signing token.
 * Searches across all three booking tables.
 */
export async function findBookingByToken(
  token: string,
): Promise<BookingForSigning | null> {
  const db = await getDb();
  if (!db) return null;

  // Search CL bookings
  const [cl] = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerId: bookings.customerId,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      status: bookings.status,
      licenceSignedAt: bookings.licenceSignedAt,
    })
    .from(bookings)
    .where(eq(bookings.licenceSignatureToken, token));

  if (cl)
    return { ...cl, assetType: "cl" };

  // Search VS bookings
  const [vs] = await db
    .select({
      id: vacantShopBookings.id,
      bookingNumber: vacantShopBookings.bookingNumber,
      customerId: vacantShopBookings.customerId,
      startDate: vacantShopBookings.startDate,
      endDate: vacantShopBookings.endDate,
      totalAmount: vacantShopBookings.totalAmount,
      gstAmount: vacantShopBookings.gstAmount,
      status: vacantShopBookings.status,
      licenceSignedAt: vacantShopBookings.licenceSignedAt,
    })
    .from(vacantShopBookings)
    .where(eq(vacantShopBookings.licenceSignatureToken, token));

  if (vs)
    return { ...vs, assetType: "vs" };

  // Search TLI bookings
  const [tli] = await db
    .select({
      id: thirdLineBookings.id,
      bookingNumber: thirdLineBookings.bookingNumber,
      customerId: thirdLineBookings.customerId,
      startDate: thirdLineBookings.startDate,
      endDate: thirdLineBookings.endDate,
      totalAmount: thirdLineBookings.totalAmount,
      gstAmount: thirdLineBookings.gstAmount,
      status: thirdLineBookings.status,
      licenceSignedAt: thirdLineBookings.licenceSignedAt,
    })
    .from(thirdLineBookings)
    .where(eq(thirdLineBookings.licenceSignatureToken, token));

  if (tli)
    return { ...tli, assetType: "tli" };

  return null;
}

/**
 * Record an e-signature on a booking.
 */
export async function recordSignature(
  token: string,
  signedByName: string,
  signedByIp: string,
): Promise<boolean> {
  const booking = await findBookingByToken(token);
  if (!booking) return false;
  if (booking.licenceSignedAt) return false; // Already signed

  const db = await getDb();
  if (!db) return false;

  const table =
    booking.assetType === "cl"
      ? bookings
      : booking.assetType === "vs"
        ? vacantShopBookings
        : thirdLineBookings;

  const now = new Date();

  await db
    .update(table)
    .set({
      licenceSignedAt: now,
      licenceSignedByName: signedByName,
      licenceSignedByIp: signedByIp,
    })
    .where(eq(table.id, booking.id));

  // Write audit log
  await db.insert(auditLog).values({
    userId: booking.customerId,
    action: "licence_signed",
    entityType: `${booking.assetType}_booking`,
    entityId: booking.id,
    changes: JSON.stringify({ signedByName, signedByIp, bookingNumber: booking.bookingNumber }),
    ipAddress: signedByIp,
    createdAt: now,
  });

  console.log(
    `[LicenceService] Signature recorded for ${booking.assetType} booking ${booking.bookingNumber} by ${signedByName}`,
  );
  return true;
}

/**
 * Get the licence signing status for a booking.
 */
export async function getLicenceStatus(
  bookingId: number,
  assetType: AssetType,
): Promise<LicenceStatus | null> {
  const db = await getDb();
  if (!db) return null;

  const table =
    assetType === "cl"
      ? bookings
      : assetType === "vs"
        ? vacantShopBookings
        : thirdLineBookings;

  const [row] = await db
    .select({
      token: table.licenceSignatureToken,
      signedAt: table.licenceSignedAt,
      signedByName: table.licenceSignedByName,
      signedByIp: table.licenceSignedByIp,
    })
    .from(table)
    .where(eq(table.id, bookingId));

  if (!row) return null;

  return {
    token: row.token,
    signedAt: row.signedAt,
    signedByName: row.signedByName,
    signedByIp: row.signedByIp,
  };
}
