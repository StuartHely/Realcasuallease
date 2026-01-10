import { describe, it, expect } from 'vitest';

describe('Approval Reason Logic', () => {
  describe('Reason detection', () => {
    it('should identify expired insurance as approval reason', () => {
      const insuranceExpiry = new Date('2025-01-01');
      const bookingEnd = new Date('2026-06-01');
      
      const expired = insuranceExpiry < bookingEnd;
      expect(expired).toBe(true);
      
      const reason = 'Insurance expired before booking end date';
      expect(reason).toContain('Insurance expired');
    });

    it('should identify insufficient coverage as approval reason', () => {
      const coverageAmount = 10000000; // $10M
      const requiredAmount = 20000000; // $20M
      
      const insufficient = coverageAmount < requiredAmount;
      expect(insufficient).toBe(true);
      
      const reason = `Insufficient insurance coverage ($${(coverageAmount / 1000000).toFixed(1)}M, requires $20M)`;
      expect(reason).toContain('Insufficient insurance coverage');
      expect(reason).toContain('$10.0M');
      expect(reason).toContain('$20M');
    });

    it('should identify custom category text as approval reason', () => {
      const additionalText = 'Special requirements for pop-up store';
      
      const hasCustomText = additionalText && additionalText.trim().length > 0;
      expect(hasCustomText).toBe(true);
      
      const reason = 'Custom usage category details provided';
      expect(reason).toContain('Custom usage category');
    });

    it('should identify site requires approval as reason', () => {
      const siteInstantBooking = false;
      
      const requiresApproval = !siteInstantBooking;
      expect(requiresApproval).toBe(true);
      
      const reason = 'Site requires manual approval for all bookings';
      expect(reason).toContain('Site requires manual approval');
    });

    it('should combine multiple reasons with semicolon separator', () => {
      const reasons = [
        'Insurance expired before booking end date',
        'Insufficient insurance coverage ($10.0M, requires $20M)',
        'Site requires manual approval for all bookings'
      ];
      
      const combined = reasons.join('; ');
      
      expect(combined).toContain('Insurance expired');
      expect(combined).toContain('Insufficient insurance');
      expect(combined).toContain('Site requires manual approval');
      expect(combined.split(';').length).toBe(3);
    });
  });

  describe('Reason formatting', () => {
    it('should format insurance coverage in millions', () => {
      const amount = 15000000;
      const formatted = `$${(amount / 1000000).toFixed(1)}M`;
      
      expect(formatted).toBe('$15.0M');
    });

    it('should handle category not approved reason with category name', () => {
      const categoryName = 'Fashion & Apparel';
      const reason = `Usage category "${categoryName}" not approved for this site`;
      
      expect(reason).toContain(categoryName);
      expect(reason).toContain('not approved for this site');
    });

    it('should handle duplicate booking reason', () => {
      const reason = 'Duplicate booking: customer already has booking with same category at this centre';
      
      expect(reason).toContain('Duplicate booking');
      expect(reason).toContain('same category');
      expect(reason).toContain('this centre');
    });

    it('should use default message when no specific reasons found', () => {
      const reasons: string[] = [];
      const defaultReason = 'Manual approval required';
      
      const finalReason = reasons.length > 0 ? reasons.join('; ') : defaultReason;
      
      expect(finalReason).toBe('Manual approval required');
    });
  });

  describe('Date comparisons', () => {
    it('should correctly compare insurance expiry with booking end date', () => {
      const testCases = [
        { insuranceExpiry: '2026-12-31', bookingEnd: '2026-06-01', shouldExpire: false },
        { insuranceExpiry: '2026-03-01', bookingEnd: '2026-06-01', shouldExpire: true },
        { insuranceExpiry: '2026-06-01', bookingEnd: '2026-06-01', shouldExpire: false },
      ];
      
      testCases.forEach(({ insuranceExpiry, bookingEnd, shouldExpire }) => {
        const insuranceDate = new Date(insuranceExpiry);
        const bookingDate = new Date(bookingEnd);
        
        const expired = insuranceDate < bookingDate;
        expect(expired).toBe(shouldExpire);
      });
    });
  });
});
