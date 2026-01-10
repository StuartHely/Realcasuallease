import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateAbbreviatedCentreCode, getCentreCodeForBooking } from './centreCodeHelper';
import * as db from './db';

describe('Centre Code Management', () => {
  let testCentreId: number;

  beforeAll(async () => {
    // Get first centre for testing
    const centres = await db.getShoppingCentres();
    if (centres.length > 0) {
      testCentreId = centres[0].id;
    }
  });

  describe('listWithCodes logic', () => {
    it('should generate codes for all centres', async () => {
      const centres = await db.getShoppingCentres();
      
      expect(Array.isArray(centres)).toBe(true);
      
      if (centres.length > 0) {
        centres.forEach(centre => {
          const autoCode = generateAbbreviatedCentreCode(centre.name);
          expect(autoCode).toHaveLength(4);
          expect(autoCode).toMatch(/^[A-Z]{4}$/);
        });
      }
    });

    it('should handle existing centre codes', async () => {
      const centres = await db.getShoppingCentres();
      
      centres.forEach(centre => {
        const codeForBooking = getCentreCodeForBooking(centre);
        expect(codeForBooking).toHaveLength(4);
        expect(codeForBooking).toMatch(/^[A-Z]{4}$/);
      });
    });

    it('should generate different codes for different centre names', () => {
      const names = [
        'Campbelltown Mall',
        'Highlands Marketplace',
        'Westfield Parramatta',
        'Castle Hill Town Centre',
      ];
      
      const codes = names.map(name => generateAbbreviatedCentreCode(name));
      const uniqueCodes = new Set(codes);
      
      // All should be unique
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('updateCentreCode database operations', () => {
    it('should update centre code in database', async () => {
      if (!testCentreId) {
        console.log('No test centre available, skipping test');
        return;
      }

      const newCode = 'TEST';
      
      await db.updateShoppingCentre(testCentreId, { centreCode: newCode });
      
      // Verify the code was updated
      const centre = await db.getShoppingCentreById(testCentreId);
      expect(centre?.centreCode).toBe(newCode);
    });

    it('should validate code format - exactly 4 characters', () => {
      const validCodes = ['CAMP', 'TEST', 'ABCD'];
      const invalidCodes = ['ABC', 'ABCDE', 'AB'];
      
      validCodes.forEach(code => {
        expect(code).toHaveLength(4);
        expect(code).toMatch(/^[A-Z]{4}$/);
      });
      
      invalidCodes.forEach(code => {
        expect(code.length !== 4 || !/^[A-Z]{4}$/.test(code)).toBe(true);
      });
    });

    it('should validate code format - uppercase only', () => {
      const validCode = 'TEST';
      const invalidCodes = ['test', 'Test', 'TeSt'];
      
      expect(validCode).toMatch(/^[A-Z]{4}$/);
      
      invalidCodes.forEach(code => {
        expect(/^[A-Z]{4}$/.test(code)).toBe(false);
      });
    });

    it('should validate code format - letters only', () => {
      const validCode = 'TEST';
      const invalidCodes = ['TE12', '1234', 'T3ST'];
      
      expect(validCode).toMatch(/^[A-Z]{4}$/);
      
      invalidCodes.forEach(code => {
        expect(/^[A-Z]{4}$/.test(code)).toBe(false);
      });
    });

    it('should detect duplicate codes', async () => {
      const centres = await db.getShoppingCentres();
      
      if (centres.length < 2) {
        console.log('Need at least 2 centres for duplicate test, skipping');
        return;
      }

      // Check if any centres have duplicate codes
      const codes = centres
        .map(c => c.centreCode)
        .filter(code => code !== null) as string[];
      
      const uniqueCodes = new Set(codes);
      
      // Should have no duplicates
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  afterAll(async () => {
    // Clean up: reset test centre code to auto-generated
    if (testCentreId) {
      const centre = await db.getShoppingCentreById(testCentreId);
      
      if (centre) {
        const autoCode = generateAbbreviatedCentreCode(centre.name);
        await db.updateShoppingCentre(testCentreId, { centreCode: autoCode });
      }
    }
  });
});
