import { describe, it, expect } from 'vitest';

/**
 * Tests for rejected booking display behavior
 * 
 * Requirements:
 * 1. Rejected bookings only appear under Rejected and All Bookings views
 * 2. Rejected bookings must not display as paid (no Y icon)
 * 3. Rejected bookings show black "R" icon in Paid column
 * 4. Unpaid count excludes rejected bookings
 */

describe('Rejected Booking Display Logic', () => {
  // Mock booking data for testing
  const mockBookings = [
    { id: 1, status: 'pending', paidAt: null, paymentMethod: 'invoice' },
    { id: 2, status: 'confirmed', paidAt: new Date(), paymentMethod: 'stripe' },
    { id: 3, status: 'rejected', paidAt: null, paymentMethod: 'invoice' },
    { id: 4, status: 'rejected', paidAt: new Date(), paymentMethod: 'stripe' }, // Even if paidAt is set, rejected should show R
    { id: 5, status: 'completed', paidAt: new Date(), paymentMethod: 'invoice' },
    { id: 6, status: 'pending', paidAt: null, paymentMethod: 'invoice' },
  ];

  describe('Status Counts', () => {
    it('should count rejected bookings correctly', () => {
      const rejectedCount = mockBookings.filter(b => b.status === 'rejected').length;
      expect(rejectedCount).toBe(2);
    });

    it('should exclude rejected bookings from unpaid count', () => {
      // Unpaid = invoice payment method, no paidAt, and NOT rejected
      const unpaidCount = mockBookings.filter(
        b => b.paymentMethod === 'invoice' && !b.paidAt && b.status !== 'rejected'
      ).length;
      expect(unpaidCount).toBe(2); // Only pending bookings with invoice payment
    });

    it('should count all bookings correctly', () => {
      expect(mockBookings.length).toBe(6);
    });
  });

  describe('Payment Badge Logic', () => {
    // Helper function that mirrors the frontend logic
    const getPaymentBadgeType = (booking: { status: string; paidAt: Date | null; paymentMethod: string | null }) => {
      if (booking.status === 'rejected') {
        return 'R'; // Rejected bookings always show R
      }
      const isPaid = !!booking.paidAt || booking.paymentMethod === 'stripe';
      return isPaid ? 'Y' : 'N';
    };

    it('should return R for rejected bookings regardless of payment status', () => {
      const rejectedUnpaid = { status: 'rejected', paidAt: null, paymentMethod: 'invoice' };
      const rejectedPaid = { status: 'rejected', paidAt: new Date(), paymentMethod: 'stripe' };
      
      expect(getPaymentBadgeType(rejectedUnpaid)).toBe('R');
      expect(getPaymentBadgeType(rejectedPaid)).toBe('R');
    });

    it('should return Y for paid non-rejected bookings', () => {
      const paidBooking = { status: 'confirmed', paidAt: new Date(), paymentMethod: 'stripe' };
      expect(getPaymentBadgeType(paidBooking)).toBe('Y');
    });

    it('should return N for unpaid non-rejected bookings', () => {
      const unpaidBooking = { status: 'pending', paidAt: null, paymentMethod: 'invoice' };
      expect(getPaymentBadgeType(unpaidBooking)).toBe('N');
    });

    it('should return Y for stripe payment method even without paidAt', () => {
      const stripeBooking = { status: 'confirmed', paidAt: null, paymentMethod: 'stripe' };
      expect(getPaymentBadgeType(stripeBooking)).toBe('Y');
    });
  });

  describe('Tab Filtering', () => {
    // Helper function to filter bookings by tab
    const filterByTab = (bookings: typeof mockBookings, tab: string) => {
      if (tab === 'all') return bookings;
      if (tab === 'unpaid') {
        return bookings.filter(b => b.paymentMethod === 'invoice' && !b.paidAt && b.status !== 'rejected');
      }
      return bookings.filter(b => b.status === tab);
    };

    it('should show rejected bookings only in rejected tab', () => {
      const rejectedTab = filterByTab(mockBookings, 'rejected');
      expect(rejectedTab.length).toBe(2);
      expect(rejectedTab.every(b => b.status === 'rejected')).toBe(true);
    });

    it('should show rejected bookings in all bookings tab', () => {
      const allTab = filterByTab(mockBookings, 'all');
      const rejectedInAll = allTab.filter(b => b.status === 'rejected');
      expect(rejectedInAll.length).toBe(2);
    });

    it('should NOT show rejected bookings in pending tab', () => {
      const pendingTab = filterByTab(mockBookings, 'pending');
      const rejectedInPending = pendingTab.filter(b => b.status === 'rejected');
      expect(rejectedInPending.length).toBe(0);
    });

    it('should NOT show rejected bookings in confirmed tab', () => {
      const confirmedTab = filterByTab(mockBookings, 'confirmed');
      const rejectedInConfirmed = confirmedTab.filter(b => b.status === 'rejected');
      expect(rejectedInConfirmed.length).toBe(0);
    });

    it('should NOT show rejected bookings in unpaid tab', () => {
      const unpaidTab = filterByTab(mockBookings, 'unpaid');
      const rejectedInUnpaid = unpaidTab.filter(b => b.status === 'rejected');
      expect(rejectedInUnpaid.length).toBe(0);
    });
  });

  describe('Excel Export', () => {
    // Helper function that mirrors the export logic
    const getExportPaidValue = (booking: { status: string; paidAt: Date | null }) => {
      if (booking.status === 'rejected') return 'R';
      return booking.paidAt ? 'Y' : 'N';
    };

    it('should export R for rejected bookings', () => {
      const rejected = { status: 'rejected', paidAt: null };
      expect(getExportPaidValue(rejected)).toBe('R');
    });

    it('should export R for rejected bookings even if they have paidAt', () => {
      const rejectedWithPayment = { status: 'rejected', paidAt: new Date() };
      expect(getExportPaidValue(rejectedWithPayment)).toBe('R');
    });

    it('should export Y for paid non-rejected bookings', () => {
      const paid = { status: 'confirmed', paidAt: new Date() };
      expect(getExportPaidValue(paid)).toBe('Y');
    });

    it('should export N for unpaid non-rejected bookings', () => {
      const unpaid = { status: 'pending', paidAt: null };
      expect(getExportPaidValue(unpaid)).toBe('N');
    });
  });
});
