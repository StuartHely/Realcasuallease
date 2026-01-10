import { describe, it, expect } from 'vitest';
import { validateInsurance } from './insuranceScanner';

describe('Expired Insurance Handling', () => {
  it('should return warnings for expired policies instead of blocking', () => {
    const expiredData = {
      expiryDate: '2023-01-01', // Past date
      insuredAmount: 20,
      policyNumber: 'POL123',
      insuranceCompany: 'Test Insurance',
      success: true,
    };

    const validation = validateInsurance(expiredData);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Insurance policy has already expired');
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should validate current policies without warnings', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const currentData = {
      expiryDate: futureDate.toISOString().split('T')[0],
      insuredAmount: 20,
      policyNumber: 'POL123',
      insuranceCompany: 'Test Insurance',
      success: true,
    };

    const validation = validateInsurance(currentData);
    
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('should warn about insufficient coverage', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const lowCoverageData = {
      expiryDate: futureDate.toISOString().split('T')[0],
      insuredAmount: 10, // Below $20M minimum
      policyNumber: 'POL123',
      insuranceCompany: 'Test Insurance',
      success: true,
    };

    const validation = validateInsurance(lowCoverageData);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('below the minimum requirement'))).toBe(true);
  });

  it('should warn about missing fields', () => {
    const incompleteData = {
      expiryDate: null,
      insuredAmount: null,
      policyNumber: null,
      insuranceCompany: null,
      success: false,
    };

    const validation = validateInsurance(incompleteData);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors).toContain('Could not extract expiry date from document');
    expect(validation.errors).toContain('Could not extract insured amount from document');
  });

  it('should handle multiple validation errors', () => {
    const badData = {
      expiryDate: '2020-01-01', // Expired
      insuredAmount: 5, // Too low
      policyNumber: null, // Missing
      insuranceCompany: null, // Missing
      success: true,
    };

    const validation = validateInsurance(badData);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBe(4); // expired, low coverage, missing policy, missing company
  });
});
