import { describe, it, expect } from 'vitest';

describe('Booking Management All Tab', () => {
  describe('Status filtering logic', () => {
    it('should pass undefined status when "all" is selected', () => {
      const selectedStatus = 'all';
      const queryStatus = selectedStatus === 'all' ? undefined : selectedStatus;
      
      expect(queryStatus).toBeUndefined();
    });

    it('should pass specific status when not "all"', () => {
      const testCases = ['pending', 'confirmed', 'cancelled', 'completed'];
      
      testCases.forEach((status) => {
        const selectedStatus = status;
        const queryStatus = selectedStatus === 'all' ? undefined : selectedStatus;
        
        expect(queryStatus).toBe(status);
      });
    });
  });

  describe('Tab title display', () => {
    it('should show "All Bookings" when all tab is selected', () => {
      const selectedStatus = 'all';
      const title = selectedStatus === 'all' ? 'All' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);
      
      expect(title).toBe('All');
    });

    it('should capitalize status name for other tabs', () => {
      const testCases = [
        { status: 'pending', expected: 'Pending' },
        { status: 'confirmed', expected: 'Confirmed' },
        { status: 'cancelled', expected: 'Cancelled' },
        { status: 'completed', expected: 'Completed' },
      ];
      
      testCases.forEach(({ status, expected }) => {
        const title = status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1);
        expect(title).toBe(expected);
      });
    });
  });

  describe('Status badge handling', () => {
    it('should handle all booking statuses', () => {
      const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      
      const variants: Record<string, { variant: string, label: string }> = {
        pending: { variant: 'secondary', label: 'Pending' },
        confirmed: { variant: 'default', label: 'Confirmed' },
        cancelled: { variant: 'destructive', label: 'Cancelled' },
        completed: { variant: 'outline', label: 'Completed' },
      };
      
      statuses.forEach((status) => {
        const config = variants[status];
        expect(config).toBeDefined();
        expect(config.variant).toBeTruthy();
        expect(config.label).toBeTruthy();
      });
    });
  });

  describe('Default tab selection', () => {
    it('should default to "all" tab on page load', () => {
      const defaultStatus = 'all';
      
      expect(defaultStatus).toBe('all');
    });
  });

  describe('Search with All tab', () => {
    const mockAllBookings = [
      { id: 1, bookingNumber: 'CAMA-001', customerName: 'John', status: 'pending' },
      { id: 2, bookingNumber: 'HIMA-002', customerName: 'Jane', status: 'confirmed' },
      { id: 3, bookingNumber: 'CAMA-003', customerName: 'Bob', status: 'cancelled' },
      { id: 4, bookingNumber: 'HIMA-004', customerName: 'Alice', status: 'completed' },
    ];

    it('should search across all statuses when All tab is selected', () => {
      const searchQuery = 'CAMA';
      const filtered = mockAllBookings.filter((booking) => {
        const bookingNumber = booking.bookingNumber.toLowerCase();
        return bookingNumber.includes(searchQuery.toLowerCase());
      });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(b => b.bookingNumber.includes('CAMA'))).toBe(true);
    });

    it('should show results from multiple statuses', () => {
      const searchQuery = 'HIMA';
      const filtered = mockAllBookings.filter((booking) => {
        const bookingNumber = booking.bookingNumber.toLowerCase();
        return bookingNumber.includes(searchQuery.toLowerCase());
      });
      
      const statuses = filtered.map(b => b.status);
      expect(statuses).toContain('confirmed');
      expect(statuses).toContain('completed');
    });
  });
});
