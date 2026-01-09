import { describe, it, expect } from 'vitest';
import nodemailer from 'nodemailer';

describe('SMTP Configuration', () => {
  it('should have valid SMTP environment variables', () => {
    expect(process.env.SMTP_HOST).toBeDefined();
    expect(process.env.SMTP_PORT).toBeDefined();
    expect(process.env.SMTP_USER).toBeDefined();
    expect(process.env.SMTP_PASS).toBeDefined();
    expect(process.env.SMTP_FROM).toBeDefined();
  });

  it('should be able to create SMTP transporter', () => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    expect(transporter).toBeDefined();
  });

  it('should verify SMTP connection', async () => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    await expect(transporter.verify()).resolves.toBe(true);
  }, 30000); // 30 second timeout for network operation
});
