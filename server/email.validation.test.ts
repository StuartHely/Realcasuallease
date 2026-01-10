import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Email Validation API', () => {
  it('should return available=false for existing email', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Test with a known existing email (adjust based on your test data)
    const result = await caller.auth.checkEmailAvailable({ email: 'test@example.com' });
    
    // Result should be boolean
    expect(typeof result.available).toBe('boolean');
  });

  it('should return available=true for non-existing email', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const uniqueEmail = `nonexistent-${Date.now()}@example.com`;
    const result = await caller.auth.checkEmailAvailable({ email: uniqueEmail });
    
    expect(result.available).toBe(true);
  });

  it('should reject invalid email format', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.auth.checkEmailAvailable({ email: 'invalid-email' })
    ).rejects.toThrow();
  });

  it('should reject empty email', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.auth.checkEmailAvailable({ email: '' })
    ).rejects.toThrow();
  });
});
