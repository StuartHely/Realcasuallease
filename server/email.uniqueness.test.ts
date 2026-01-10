import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { users } from '../drizzle/schema';

describe('Email Uniqueness Constraint', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');
  });

  it('should prevent duplicate email addresses', async () => {
    const testEmail = `test-unique-${Date.now()}@example.com`;
    const testOpenId = `test-openid-${Date.now()}`;
    
    // Insert first user with test email
    await db.insert(users).values({
      openId: testOpenId,
      email: testEmail,
      name: 'Test User 1',
      role: 'customer',
    });

    // Attempt to insert second user with same email
    await expect(
      db.insert(users).values({
        openId: `${testOpenId}-2`,
        email: testEmail, // Same email
        name: 'Test User 2',
        role: 'customer',
      })
    ).rejects.toThrow();

    // Clean up
    const { eq } = await import('drizzle-orm');
    await db.delete(users).where(eq(users.email, testEmail));
  });

  it('should allow users with null emails', async () => {
    const testOpenId1 = `test-null-email-1-${Date.now()}`;
    const testOpenId2 = `test-null-email-2-${Date.now()}`;
    
    // Insert first user with null email
    await db.insert(users).values({
      openId: testOpenId1,
      email: null,
      name: 'Test User Null 1',
      role: 'customer',
    });

    // Insert second user with null email - should succeed
    await db.insert(users).values({
      openId: testOpenId2,
      email: null,
      name: 'Test User Null 2',
      role: 'customer',
    });

    // Clean up
    const { eq, or } = await import('drizzle-orm');
    await db.delete(users).where(
      or(
        eq(users.openId, testOpenId1),
        eq(users.openId, testOpenId2)
      )
    );
  });

  it('should allow different email addresses', async () => {
    const timestamp = Date.now();
    const testEmail1 = `test-diff-1-${timestamp}@example.com`;
    const testEmail2 = `test-diff-2-${timestamp}@example.com`;
    
    // Insert two users with different emails
    await db.insert(users).values({
      openId: `test-openid-diff-1-${timestamp}`,
      email: testEmail1,
      name: 'Test User A',
      role: 'customer',
    });

    await db.insert(users).values({
      openId: `test-openid-diff-2-${timestamp}`,
      email: testEmail2,
      name: 'Test User B',
      role: 'customer',
    });

    // Clean up
    const { eq, or } = await import('drizzle-orm');
    await db.delete(users).where(
      or(
        eq(users.email, testEmail1),
        eq(users.email, testEmail2)
      )
    );
  });
});
