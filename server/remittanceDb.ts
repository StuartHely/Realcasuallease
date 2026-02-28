import { getDb, resolveRemittanceBankAccount } from './db';
import {
  bookings, sites, shoppingCentres, users, owners, portfolios,
  vacantShopBookings, vacantShops, thirdLineBookings, thirdLineIncome,
} from '../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

type Subtotal = {
  totalAmount: number;
  gstAmount: number;
  ownerAmount: number;
  platformFee: number;
};

type BookingItem = {
  bookingNumber: string;
  customerName: string;
  assetType: 'site' | 'vacant_shop' | 'third_line';
  assetIdentifier: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  gstAmount: number;
  ownerAmount: number;
  platformFee: number;
  paidAt: Date | null;
  paymentMethod: string;
};

type CentreGroup = {
  centreId: number;
  centreName: string;
  bankDetails: { bsb: string; accountNumber: string; accountName: string } | null;
  bookings: BookingItem[];
  subtotal: Subtotal;
};

type PortfolioGroup = {
  portfolioId: number | null;
  portfolioName: string;
  centres: CentreGroup[];
  subtotal: Subtotal;
};

type OwnerGroup = {
  ownerId: number;
  ownerName: string;
  portfolios: PortfolioGroup[];
  subtotal: Subtotal;
};

export type RemittanceReport = {
  month: number;
  year: number;
  owners: OwnerGroup[];
  grandTotal: Subtotal;
};

function emptySubtotal(): Subtotal {
  return { totalAmount: 0, gstAmount: 0, ownerAmount: 0, platformFee: 0 };
}

function addToSubtotal(sub: Subtotal, item: { totalAmount: number; gstAmount: number; ownerAmount: number; platformFee: number }) {
  sub.totalAmount += item.totalAmount;
  sub.gstAmount += item.gstAmount;
  sub.ownerAmount += item.ownerAmount;
  sub.platformFee += item.platformFee;
}

export async function getRemittanceReport(month: number, year: number): Promise<RemittanceReport> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // 1. Site bookings
  const siteBookingsRaw = await db.select({
    bookingNumber: bookings.bookingNumber,
    customerName: users.name,
    siteNumber: sites.siteNumber,
    startDate: bookings.startDate,
    endDate: bookings.endDate,
    totalAmount: bookings.totalAmount,
    gstAmount: bookings.gstAmount,
    ownerAmount: bookings.ownerAmount,
    platformFee: bookings.platformFee,
    paidAt: bookings.paidAt,
    paymentMethod: bookings.paymentMethod,
    centreId: shoppingCentres.id,
    centreName: shoppingCentres.name,
    ownerId: shoppingCentres.ownerId,
    portfolioId: shoppingCentres.portfolioId,
  }).from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(and(
      eq(bookings.status, 'confirmed'),
      lte(bookings.startDate, monthEnd),
      gte(bookings.endDate, monthStart),
    ));

  // 2. Vacant shop bookings
  const vsBookingsRaw = await db.select({
    bookingNumber: vacantShopBookings.bookingNumber,
    customerName: users.name,
    shopNumber: vacantShops.shopNumber,
    startDate: vacantShopBookings.startDate,
    endDate: vacantShopBookings.endDate,
    totalAmount: vacantShopBookings.totalAmount,
    gstAmount: vacantShopBookings.gstAmount,
    ownerAmount: vacantShopBookings.ownerAmount,
    platformFee: vacantShopBookings.platformFee,
    paidAt: vacantShopBookings.paidAt,
    paymentMethod: vacantShopBookings.paymentMethod,
    centreId: shoppingCentres.id,
    centreName: shoppingCentres.name,
    ownerId: shoppingCentres.ownerId,
    portfolioId: shoppingCentres.portfolioId,
  }).from(vacantShopBookings)
    .innerJoin(users, eq(vacantShopBookings.customerId, users.id))
    .innerJoin(vacantShops, eq(vacantShopBookings.vacantShopId, vacantShops.id))
    .innerJoin(shoppingCentres, eq(vacantShops.centreId, shoppingCentres.id))
    .where(and(
      eq(vacantShopBookings.status, 'confirmed'),
      lte(vacantShopBookings.startDate, monthEnd),
      gte(vacantShopBookings.endDate, monthStart),
    ));

  // 3. Third line bookings
  const tlBookingsRaw = await db.select({
    bookingNumber: thirdLineBookings.bookingNumber,
    customerName: users.name,
    assetNumber: thirdLineIncome.assetNumber,
    startDate: thirdLineBookings.startDate,
    endDate: thirdLineBookings.endDate,
    totalAmount: thirdLineBookings.totalAmount,
    gstAmount: thirdLineBookings.gstAmount,
    ownerAmount: thirdLineBookings.ownerAmount,
    platformFee: thirdLineBookings.platformFee,
    paidAt: thirdLineBookings.paidAt,
    paymentMethod: thirdLineBookings.paymentMethod,
    centreId: shoppingCentres.id,
    centreName: shoppingCentres.name,
    ownerId: shoppingCentres.ownerId,
    portfolioId: shoppingCentres.portfolioId,
  }).from(thirdLineBookings)
    .innerJoin(users, eq(thirdLineBookings.customerId, users.id))
    .innerJoin(thirdLineIncome, eq(thirdLineBookings.thirdLineIncomeId, thirdLineIncome.id))
    .innerJoin(shoppingCentres, eq(thirdLineIncome.centreId, shoppingCentres.id))
    .where(and(
      eq(thirdLineBookings.status, 'confirmed'),
      lte(thirdLineBookings.startDate, monthEnd),
      gte(thirdLineBookings.endDate, monthStart),
    ));

  // Normalize all bookings into BookingItem[]
  type RawBooking = {
    bookingNumber: string;
    customerName: string | null;
    assetType: 'site' | 'vacant_shop' | 'third_line';
    assetIdentifier: string;
    startDate: Date;
    endDate: Date;
    totalAmount: string;
    gstAmount: string;
    ownerAmount: string;
    platformFee: string;
    paidAt: Date | null;
    paymentMethod: string;
    centreId: number;
    centreName: string;
    ownerId: number;
    portfolioId: number | null;
  };

  const allBookings: RawBooking[] = [
    ...siteBookingsRaw.map(b => ({ ...b, assetType: 'site' as const, assetIdentifier: `Site ${b.siteNumber}`, customerName: b.customerName })),
    ...vsBookingsRaw.map(b => ({ ...b, assetType: 'vacant_shop' as const, assetIdentifier: `Shop ${b.shopNumber}`, customerName: b.customerName })),
    ...tlBookingsRaw.map(b => ({ ...b, assetType: 'third_line' as const, assetIdentifier: `Asset ${b.assetNumber}`, customerName: b.customerName })),
  ];

  // Get owner and portfolio names
  const allOwners = await db.select({ id: owners.id, name: owners.name }).from(owners);
  const allPortfolios = await db.select({ id: portfolios.id, name: portfolios.name }).from(portfolios);

  const ownerMap = new Map(allOwners.map(o => [o.id, o.name]));
  const portfolioMap = new Map(allPortfolios.map(p => [p.id, p.name]));

  // Get unique centre IDs for bank details
  const uniqueCentreIds = Array.from(new Set(allBookings.map(b => b.centreId)));
  const bankDetailsMap = new Map<number, { bsb: string; accountNumber: string; accountName: string } | null>();
  for (const cId of uniqueCentreIds) {
    const bank = await resolveRemittanceBankAccount(cId);
    bankDetailsMap.set(cId, bank ? {
      bsb: bank.bankBsb,
      accountNumber: bank.bankAccountNumber,
      accountName: bank.bankAccountName,
    } : null);
  }

  // Group: owner → portfolio → centre → bookings
  const ownerGroups = new Map<number, Map<number | null, Map<number, BookingItem[]>>>();

  for (const raw of allBookings) {
    if (!ownerGroups.has(raw.ownerId)) ownerGroups.set(raw.ownerId, new Map());
    const portfolioGroups = ownerGroups.get(raw.ownerId)!;
    const pId = raw.portfolioId;
    if (!portfolioGroups.has(pId)) portfolioGroups.set(pId, new Map());
    const centreGroups = portfolioGroups.get(pId)!;
    if (!centreGroups.has(raw.centreId)) centreGroups.set(raw.centreId, []);

    centreGroups.get(raw.centreId)!.push({
      bookingNumber: raw.bookingNumber,
      customerName: raw.customerName || 'Unknown',
      assetType: raw.assetType,
      assetIdentifier: raw.assetIdentifier,
      startDate: raw.startDate,
      endDate: raw.endDate,
      totalAmount: Number(raw.totalAmount),
      gstAmount: Number(raw.gstAmount),
      ownerAmount: Number(raw.ownerAmount),
      platformFee: Number(raw.platformFee),
      paidAt: raw.paidAt,
      paymentMethod: raw.paymentMethod,
    });
  }

  // Build hierarchical result
  const grandTotal = emptySubtotal();
  const reportOwners: OwnerGroup[] = [];

  // Get centre name map
  const centreNameMap = new Map<number, string>();
  for (const b of allBookings) {
    centreNameMap.set(b.centreId, b.centreName);
  }

  ownerGroups.forEach((portfolioGroups, ownerId) => {
    const ownerSubtotal = emptySubtotal();
    const ownerPortfolios: PortfolioGroup[] = [];

    portfolioGroups.forEach((centreGroups, portfolioId) => {
      const portfolioSubtotal = emptySubtotal();
      const portfolioCentres: CentreGroup[] = [];

      centreGroups.forEach((bookingItems, centreId) => {
        const centreSubtotal = emptySubtotal();
        for (const item of bookingItems) {
          addToSubtotal(centreSubtotal, item);
        }
        addToSubtotal(portfolioSubtotal, centreSubtotal);

        portfolioCentres.push({
          centreId,
          centreName: centreNameMap.get(centreId) || `Centre ${centreId}`,
          bankDetails: bankDetailsMap.get(centreId) || null,
          bookings: bookingItems,
          subtotal: centreSubtotal,
        });
      });
      addToSubtotal(ownerSubtotal, portfolioSubtotal);

      ownerPortfolios.push({
        portfolioId: portfolioId,
        portfolioName: portfolioId ? (portfolioMap.get(portfolioId) || `Portfolio ${portfolioId}`) : 'No Portfolio',
        centres: portfolioCentres,
        subtotal: portfolioSubtotal,
      });
    });
    addToSubtotal(grandTotal, ownerSubtotal);

    reportOwners.push({
      ownerId,
      ownerName: ownerMap.get(ownerId) || `Owner ${ownerId}`,
      portfolios: ownerPortfolios,
      subtotal: ownerSubtotal,
    });
  });

  return { month, year, owners: reportOwners, grandTotal };
}
