import { getDb } from './db';
import { bookings, sites, shoppingCentres, users } from '../drizzle/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export interface InvoiceStats {
  totalOutstanding: number;
  totalOverdue: number;
  outstandingCount: number;
  overdueCount: number;
}

export interface InvoiceListItem {
  bookingId: number;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  companyName: string | null;
  centreName: string;
  siteNumber: string;
  startDate: Date;
  endDate: Date;
  totalAmount: string;
  gstAmount: string;
  approvedAt: Date | null;
  dueDate: Date | null;
  daysUntilDue: number;
  status: 'outstanding' | 'overdue';
  paymentMethod: string;
}

function buildPaymentMethodFilter(paymentMode?: 'all' | 'invoice' | 'stripe') {
  if (paymentMode === 'stripe') return eq(bookings.paymentMethod, 'stripe');
  if (paymentMode === 'invoice' || !paymentMode) return eq(bookings.paymentMethod, 'invoice');
  return undefined; // 'all' — no payment method filter
}

/**
 * Get invoice dashboard statistics
 */
export async function getInvoiceStats(paymentMode?: 'all' | 'invoice' | 'stripe'): Promise<InvoiceStats> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const now = new Date();

  const pmFilter = buildPaymentMethodFilter(paymentMode);

  // Get all unpaid bookings
  const unpaidInvoices = await db
    .select({
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      approvedAt: bookings.approvedAt,
    })
    .from(bookings)
    .where(
      and(
        ...[pmFilter, eq(bookings.status, 'confirmed'), isNull(bookings.paidAt)].filter(Boolean)
      )
    );

  let totalOutstanding = 0;
  let totalOverdue = 0;
  let outstandingCount = 0;
  let overdueCount = 0;

  for (const invoice of unpaidInvoices) {
    if (!invoice.approvedAt) continue;

    const total = Number(invoice.totalAmount) + Number(invoice.gstAmount);
    
    // Calculate due date (14 days from approval)
    const dueDate = new Date(invoice.approvedAt);
    dueDate.setDate(dueDate.getDate() + 14);

    if (dueDate < now) {
      // Overdue
      totalOverdue += total;
      overdueCount++;
    } else {
      // Outstanding but not overdue
      totalOutstanding += total;
      outstandingCount++;
    }
  }

  return {
    totalOutstanding,
    totalOverdue,
    outstandingCount,
    overdueCount,
  };
}

/**
 * Get list of all unpaid invoices with details
 */
export async function getInvoiceList(filter: 'all' | 'outstanding' | 'overdue' | 'paid', paymentMode?: 'all' | 'invoice' | 'stripe'): Promise<InvoiceListItem[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const now = new Date();

  const pmFilter = buildPaymentMethodFilter(paymentMode);

  // Base query
  const conditions: any[] = [eq(bookings.status, 'confirmed')];
  if (pmFilter) conditions.push(pmFilter);

  // Add filter for paid/unpaid
  if (filter === 'paid') {
    conditions.push(sql`${bookings.paidAt} IS NOT NULL`);
  } else {
    conditions.push(isNull(bookings.paidAt));
  }

  const whereClause = and(...conditions);

  const invoices = await db
    .select({
      bookingId: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerName: users.name,
      customerEmail: users.email,
      companyName: sql<string | null>`(SELECT companyName FROM customer_profiles WHERE userId = ${bookings.customerId} LIMIT 1)`,
      centreName: shoppingCentres.name,
      siteNumber: sites.siteNumber,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      approvedAt: bookings.approvedAt,
      paymentMethod: bookings.paymentMethod,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(whereClause)
    .orderBy(bookings.approvedAt);

  // Calculate due dates and filter based on status
  const result: InvoiceListItem[] = [];

  for (const invoice of invoices) {
    if (!invoice.approvedAt) continue;

    // Calculate due date (14 days from approval)
    const dueDate = new Date(invoice.approvedAt);
    dueDate.setDate(dueDate.getDate() + 14);

    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const status: 'outstanding' | 'overdue' = daysUntilDue < 0 ? 'overdue' : 'outstanding';

    // Apply filter
    if (filter === 'outstanding' && status !== 'outstanding') continue;
    if (filter === 'overdue' && status !== 'overdue') continue;

    result.push({
      bookingId: invoice.bookingId,
      bookingNumber: invoice.bookingNumber,
      customerName: invoice.customerName || 'Unknown',
      customerEmail: invoice.customerEmail || '',
      companyName: invoice.companyName,
      centreName: invoice.centreName,
      siteNumber: invoice.siteNumber,
      startDate: invoice.startDate,
      endDate: invoice.endDate,
      totalAmount: invoice.totalAmount,
      gstAmount: invoice.gstAmount,
      approvedAt: invoice.approvedAt,
      dueDate,
      daysUntilDue,
      status,
      paymentMethod: invoice.paymentMethod,
    });
  }

  return result;
}

/**
 * Get payment history (paid bookings)
 */
export async function getPaymentHistory(searchTerm?: string, paymentMode?: 'all' | 'invoice' | 'stripe'): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const pmFilter = buildPaymentMethodFilter(paymentMode);
  const conditions: any[] = [eq(bookings.status, 'confirmed'), sql`${bookings.paidAt} IS NOT NULL`];
  if (pmFilter) conditions.push(pmFilter);

  let whereClause = and(...conditions);

  // Add search filter if provided
  if (searchTerm && searchTerm.trim().length > 0) {
    const searchPattern = `%${searchTerm}%`;
    whereClause = and(
      whereClause!,
      sql`(${bookings.bookingNumber} LIKE ${searchPattern} OR ${users.name} LIKE ${searchPattern} OR ${users.email} LIKE ${searchPattern})`
    );
  }

  const payments = await db
    .select({
      bookingId: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerName: users.name,
      customerEmail: users.email,
      companyName: sql<string | null>`(SELECT companyName FROM customer_profiles WHERE userId = ${bookings.customerId} LIMIT 1)`,
      centreName: shoppingCentres.name,
      siteNumber: sites.siteNumber,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalAmount: bookings.totalAmount,
      gstAmount: bookings.gstAmount,
      approvedAt: bookings.approvedAt,
      paidAt: bookings.paidAt,
      paymentMethod: bookings.paymentMethod,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(sites, eq(bookings.siteId, sites.id))
    .innerJoin(shoppingCentres, eq(sites.centreId, shoppingCentres.id))
    .where(whereClause)
    .orderBy(sql`${bookings.paidAt} DESC`);

  return payments.map(p => ({
    ...p,
    totalWithGst: (Number(p.totalAmount) + Number(p.gstAmount)).toFixed(2),
  }));
}
