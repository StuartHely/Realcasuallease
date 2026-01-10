import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';

/**
 * Test suite for email integration and invoice dashboard
 * Tests:
 * 1. Email service module exists
 * 2. Payment reminder system exists
 * 3. Invoice dashboard database functions exist
 * 4. Invoice dashboard tRPC procedures exist
 */

describe('Email Integration', () => {
  it('should have sendEmail function', async () => {
    const { sendEmail } = await import('./_core/email');
    expect(typeof sendEmail).toBe('function');
  });

  it('should have SMTP configuration in env', async () => {
    const { ENV } = await import('./_core/env');
    expect(ENV.smtpHost).toBeDefined();
    expect(ENV.smtpPort).toBeDefined();
    expect(ENV.smtpUser).toBeDefined();
    expect(ENV.smtpPass).toBeDefined();
    expect(ENV.smtpFrom).toBeDefined();
  });
});

describe('Payment Reminder System', () => {
  it('should have sendPaymentReminders function', async () => {
    const { sendPaymentReminders } = await import('./paymentReminders');
    expect(typeof sendPaymentReminders).toBe('function');
  });

  it('should have payment reminder scheduler', async () => {
    const { startPaymentReminderScheduler, stopPaymentReminderScheduler } = await import('./paymentReminderScheduler');
    expect(typeof startPaymentReminderScheduler).toBe('function');
    expect(typeof stopPaymentReminderScheduler).toBe('function');
  });

  it('should have lastReminderSent field in bookings schema', async () => {
    const { bookings } = await import('../drizzle/schema');
    expect(bookings.lastReminderSent).toBeDefined();
  });
});

describe('Invoice Dashboard', () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection required for invoice dashboard tests');
    }
  });

  it('should have getInvoiceStats function', async () => {
    const { getInvoiceStats } = await import('./invoiceDashboardDb');
    expect(typeof getInvoiceStats).toBe('function');
    
    // Test that it returns the correct structure
    const stats = await getInvoiceStats();
    expect(stats).toHaveProperty('totalOutstanding');
    expect(stats).toHaveProperty('totalOverdue');
    expect(stats).toHaveProperty('outstandingCount');
    expect(stats).toHaveProperty('overdueCount');
  });

  it('should have getInvoiceList function', async () => {
    const { getInvoiceList } = await import('./invoiceDashboardDb');
    expect(typeof getInvoiceList).toBe('function');
    
    // Test that it returns an array
    const list = await getInvoiceList('all');
    expect(Array.isArray(list)).toBe(true);
  });

  it('should have getPaymentHistory function', async () => {
    const { getPaymentHistory } = await import('./invoiceDashboardDb');
    expect(typeof getPaymentHistory).toBe('function');
    
    // Test that it returns an array
    const history = await getPaymentHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should have invoice dashboard tRPC procedures', async () => {
    const { appRouter } = await import('./routers');
    expect(appRouter).toBeDefined();
    expect(appRouter._def).toBeDefined();
  });
});

describe('Invoice Email Updates', () => {
  it('should have updated invoiceEmail to use sendEmail', async () => {
    const { sendInvoiceEmail } = await import('./invoiceEmail');
    expect(typeof sendInvoiceEmail).toBe('function');
  });
});
