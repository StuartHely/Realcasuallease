import { describe, it, expect } from 'vitest';

describe('Booking Search Functionality', () => {
  describe('Search filtering logic', () => {
    const mockBookings = [
      {
        id: 1,
        bookingNumber: 'CAMA-20260601-001',
        customerName: 'John Smith',
        customerEmail: 'john@example.com',
        siteName: 'Site A',
        centreName: 'Campbelltown Mall',
      },
      {
        id: 2,
        bookingNumber: 'HIMA-20260602-002',
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        siteName: 'Site B',
        centreName: 'Highlands Marketplace',
      },
      {
        id: 3,
        bookingNumber: 'CAMA-20260603-003',
        customerName: 'Bob Johnson',
        customerEmail: 'bob@example.com',
        siteName: 'Site C',
        centreName: 'Campbelltown Mall',
      },
    ];

    it('should filter by booking number', () => {
      const query = 'CAMA';
      const filtered = mockBookings.filter((booking) => {
        const bookingNumber = booking.bookingNumber?.toLowerCase() || '';
        return bookingNumber.includes(query.toLowerCase());
      });

      expect(filtered.length).toBe(2);
      expect(filtered[0].bookingNumber).toContain('CAMA');
      expect(filtered[1].bookingNumber).toContain('CAMA');
    });

    it('should filter by customer name', () => {
      const query = 'john';
      const filtered = mockBookings.filter((booking) => {
        const customerName = booking.customerName?.toLowerCase() || '';
        return customerName.includes(query.toLowerCase());
      });

      expect(filtered.length).toBe(2); // John Smith and Bob Johnson
      expect(filtered.some(b => b.customerName.includes('John'))).toBe(true);
    });

    it('should filter by customer email', () => {
      const query = 'jane@';
      const filtered = mockBookings.filter((booking) => {
        const customerEmail = booking.customerEmail?.toLowerCase() || '';
        return customerEmail.includes(query.toLowerCase());
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].customerEmail).toBe('jane@example.com');
    });

    it('should be case insensitive', () => {
      const queries = ['CAMA', 'cama', 'CaMa'];
      
      queries.forEach((query) => {
        const filtered = mockBookings.filter((booking) => {
          const bookingNumber = booking.bookingNumber?.toLowerCase() || '';
          return bookingNumber.includes(query.toLowerCase());
        });
        
        expect(filtered.length).toBe(2);
      });
    });

    it('should return all bookings when query is empty', () => {
      const query = '';
      const filtered = query.trim() ? mockBookings.filter((booking) => {
        const bookingNumber = booking.bookingNumber?.toLowerCase() || '';
        const customerName = booking.customerName?.toLowerCase() || '';
        return bookingNumber.includes(query.toLowerCase()) || 
               customerName.includes(query.toLowerCase());
      }) : mockBookings;

      expect(filtered.length).toBe(mockBookings.length);
    });

    it('should return empty array when no matches found', () => {
      const query = 'NONEXISTENT';
      const filtered = mockBookings.filter((booking) => {
        const bookingNumber = booking.bookingNumber?.toLowerCase() || '';
        const customerName = booking.customerName?.toLowerCase() || '';
        const customerEmail = booking.customerEmail?.toLowerCase() || '';
        
        return bookingNumber.includes(query.toLowerCase()) || 
               customerName.includes(query.toLowerCase()) ||
               customerEmail.includes(query.toLowerCase());
      });

      expect(filtered.length).toBe(0);
    });

    it('should handle partial matches', () => {
      const query = '001';
      const filtered = mockBookings.filter((booking) => {
        const bookingNumber = booking.bookingNumber?.toLowerCase() || '';
        return bookingNumber.includes(query.toLowerCase());
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].bookingNumber).toContain('001');
    });

    it('should search across multiple fields', () => {
      const query = 'jane';
      const filtered = mockBookings.filter((booking) => {
        const bookingNumber = booking.bookingNumber?.toLowerCase() || '';
        const customerName = booking.customerName?.toLowerCase() || '';
        const customerEmail = booking.customerEmail?.toLowerCase() || '';
        
        return bookingNumber.includes(query.toLowerCase()) || 
               customerName.includes(query.toLowerCase()) ||
               customerEmail.includes(query.toLowerCase());
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].customerName).toBe('Jane Doe');
    });
  });

  describe('Search result display', () => {
    it('should show count of filtered results', () => {
      const totalBookings = 10;
      const filteredCount = 3;
      const searchQuery = 'CAMA';
      
      const message = `${filteredCount} of ${totalBookings} booking(s) match "${searchQuery}"`;
      
      expect(message).toContain('3 of 10');
      expect(message).toContain('CAMA');
    });

    it('should show total count when no search query', () => {
      const totalBookings = 10;
      const searchQuery = '';
      
      const message = searchQuery 
        ? `filtered results`
        : `${totalBookings} booking(s) found`;
      
      expect(message).toBe('10 booking(s) found');
    });

    it('should show no results message', () => {
      const searchQuery = 'NONEXISTENT';
      const message = `No bookings match "${searchQuery}"`;
      
      expect(message).toContain('No bookings match');
      expect(message).toContain('NONEXISTENT');
    });
  });
});
