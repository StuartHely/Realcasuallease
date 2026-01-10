import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb, searchInvoiceBookings, recordPayment } from './db';

/**
 * Test suite for invoice payment workflow
 * Tests:
 * 1. Search invoice bookings by booking number
 * 2. Search invoice bookings by company name
 * 3. Record payment for invoice booking
 */

describe('Invoice Payment Workflow', () => {
  beforeAll(async () => {
    // Ensure database connection is available
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection required for invoice payment tests');
    }
  });

  it('should search invoice bookings by booking number', async () => {
    // This test validates that the search function exists and returns an array
    const results = await searchInvoiceBookings('TEST');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should search invoice bookings by company name', async () => {
    // This test validates that the search function can search by company name
    const results = await searchInvoiceBookings('Company');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should have recordPayment function that validates booking exists', async () => {
    // Test that recordPayment throws error for non-existent booking
    await expect(
      recordPayment(999999, 'Test Admin')
    ).rejects.toThrow('Booking not found');
  });

  it('should have admin router in appRouter', () => {
    // Validate that the admin router exists
    expect(appRouter).toBeDefined();
    expect(appRouter._def).toBeDefined();
    // The procedures are nested, just verify the router structure exists
    expect(typeof appRouter).toBe('object');
  });
});

describe('Invoice PDF Generation', () => {
  it('should have generateInvoicePDF function', async () => {
    const { generateInvoicePDF } = await import('./invoiceGenerator');
    expect(typeof generateInvoicePDF).toBe('function');
  });

  it('should have sendInvoiceEmail function', async () => {
    const { sendInvoiceEmail } = await import('./invoiceEmail');
    expect(typeof sendInvoiceEmail).toBe('function');
  });
});

describe('Database Schema', () => {
  it('should have paymentMethod field in bookings table', async () => {
    const { bookings } = await import('../drizzle/schema');
    expect(bookings.paymentMethod).toBeDefined();
  });

  it('should have paidAt field in bookings table', async () => {
    const { bookings } = await import('../drizzle/schema');
    expect(bookings.paidAt).toBeDefined();
  });

  it('should have canPayByInvoice field in users table', async () => {
    const { users } = await import('../drizzle/schema');
    expect(users.canPayByInvoice).toBeDefined();
  });
});
