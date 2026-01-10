import nodemailer from 'nodemailer';
import { ENV } from './env';

export interface EmailAttachment {
  filename: string;
  content: string;
  encoding: 'base64' | 'utf-8';
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Send email using SMTP configuration
 * Returns true if email was sent successfully, false otherwise
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  // Check if SMTP is configured
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass || !ENV.smtpFrom) {
    console.warn('[Email] SMTP not configured, skipping email send');
    return false;
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: ENV.smtpSecure,
      auth: {
        user: ENV.smtpUser,
        pass: ENV.smtpPass,
      },
    });

    // Prepare email
    const mailOptions: any = {
      from: ENV.smtpFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: att.encoding,
      }));
    }

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('[Email] Successfully sent email to:', options.to);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return false;
  }
}
