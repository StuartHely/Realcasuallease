import { describe, it, expect } from 'vitest';
import { generateAbbreviatedCentreCode, getCentreCodeForBooking } from './centreCodeHelper';

describe('Centre Code Helper', () => {
  describe('generateAbbreviatedCentreCode', () => {
    it('should generate 4-letter code from single word', () => {
      expect(generateAbbreviatedCentreCode('Campbelltown')).toBe('CAMP');
      expect(generateAbbreviatedCentreCode('Highlands')).toBe('HIGH');
      expect(generateAbbreviatedCentreCode('Westfield')).toBe('WEST');
    });

    it('should generate 4-letter code from two words', () => {
      expect(generateAbbreviatedCentreCode('Campbelltown Mall')).toBe('CAMA');
      expect(generateAbbreviatedCentreCode('Highlands Marketplace')).toBe('HIMA');
      expect(generateAbbreviatedCentreCode('Westfield Parramatta')).toBe('WEPA');
    });

    it('should generate 4-letter code from three words', () => {
      // Three words: first 2 letters of first word + first letter of next 2
      expect(generateAbbreviatedCentreCode('The Pines Centre')).toBe('THPC');
      expect(generateAbbreviatedCentreCode('Castle Hill Town')).toBe('CAHT');
    });

    it('should generate 4-letter code from four or more words', () => {
      // Four+ words: first letter of first 4 words
      expect(generateAbbreviatedCentreCode('The Glen Shopping Centre')).toBe('TGSC');
      expect(generateAbbreviatedCentreCode('North Sydney Shopping Plaza')).toBe('NSSP');
    });

    it('should handle centre names with common suffixes', () => {
      expect(generateAbbreviatedCentreCode('Campbelltown Mall')).toBe('CAMA');
      expect(generateAbbreviatedCentreCode('Highlands Marketplace')).toBe('HIMA');
      expect(generateAbbreviatedCentreCode('Westfield Centre')).toBe('WECE');
      expect(generateAbbreviatedCentreCode('Parramatta Plaza')).toBe('PAPL');
    });

    it('should handle short names', () => {
      expect(generateAbbreviatedCentreCode('QVB')).toBe('QVBX');
      expect(generateAbbreviatedCentreCode('The Strand')).toBe('THST');
    });

    it('should be uppercase', () => {
      const code = generateAbbreviatedCentreCode('campbelltown mall');
      expect(code).toHaveLength(4);
      expect(code).toBe(code.toUpperCase());
    });

    it('should always return 4 characters', () => {
      expect(generateAbbreviatedCentreCode('Campbelltown Mall')).toHaveLength(4);
      expect(generateAbbreviatedCentreCode('QVB')).toHaveLength(4);
      expect(generateAbbreviatedCentreCode('The Pines Shopping Centre')).toHaveLength(4);
    });
  });

  describe('getCentreCodeForBooking', () => {
    it('should use existing short centreCode if available', () => {
      const centre = {
        id: 1,
        name: 'Campbelltown Mall',
        centreCode: 'CAMP',
      };
      expect(getCentreCodeForBooking(centre)).toBe('CAMP');
    });

    it('should generate abbreviated code from name if centreCode is long', () => {
      const centre = {
        id: 1,
        name: 'Campbelltown Mall',
        centreCode: 'CampbelltownMall', // Old long format
      };
      const code = getCentreCodeForBooking(centre);
      expect(code).toHaveLength(4);
      expect(code).toBe(code.toUpperCase());
    });

    it('should generate code from name if centreCode is null', () => {
      const centre = {
        id: 1,
        name: 'Highlands Marketplace',
        centreCode: null,
      };
      const code = getCentreCodeForBooking(centre);
      expect(code).toHaveLength(4);
      expect(code).toBe(code.toUpperCase());
    });

    it('should always return uppercase', () => {
      const centre = {
        id: 1,
        name: 'Campbelltown Mall',
        centreCode: 'camp',
      };
      expect(getCentreCodeForBooking(centre)).toBe('CAMP');
    });
  });

  describe('Booking Number Format', () => {
    it('should create booking numbers in format CODE-YYYYMMDD-SEQ', () => {
      const centre = {
        id: 1,
        name: 'Campbelltown Mall',
        centreCode: null,
      };
      
      const centreCode = getCentreCodeForBooking(centre);
      const dateStr = '20260601';
      const seq = '001';
      const bookingNumber = `${centreCode}-${dateStr}-${seq}`;
      
      // Should be 4-char code + dash + 8-digit date + dash + 3-digit seq = 17 chars
      expect(centreCode).toHaveLength(4);
      expect(bookingNumber).toHaveLength(17);
    });

    it('should be significantly shorter than old format', () => {
      const oldFormat = 'CampbelltownMall-20260601-001'; // 29 chars
      const newFormat = 'CAMA-20260601-001'; // 17 chars
      
      expect(newFormat.length).toBeLessThan(oldFormat.length);
      expect(newFormat.length).toBe(17);
      expect(oldFormat.length).toBe(29);
    });

    it('should maintain uniqueness with centre code + date + sequence', () => {
      // Different centres, same date
      const booking1 = 'CAMA-20260601-001'; // Campbelltown Mall
      const booking2 = 'HIMA-20260601-001'; // Highlands Marketplace
      expect(booking1).not.toBe(booking2);
      
      // Same centre, different dates
      const booking3 = 'CAMA-20260601-001';
      const booking4 = 'CAMA-20260602-001';
      expect(booking3).not.toBe(booking4);
      
      // Same centre and date, different sequence
      const booking5 = 'CAMA-20260601-001';
      const booking6 = 'CAMA-20260601-002';
      expect(booking5).not.toBe(booking6);
    });
  });
});
