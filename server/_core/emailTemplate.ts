import { getLogoUrlForEmail } from '../logoHelper';

/**
 * Generate HTML email template with logo header
 * This creates a professional email layout with the selected logo
 */
export async function generateEmailTemplate(content: string, title?: string): Promise<string> {
  const logoUrl = await getLogoUrlForEmail();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Real Casual Leasing'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px; border-bottom: 2px solid #f0f0f0;">
              <img src="${logoUrl}" alt="Real Casual Leasing" style="max-width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #666; text-align: center;">
                © ${new Date().getFullYear()} Real Casual Leasing. All rights reserved.
              </p>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #999; text-align: center;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate simple HTML content for embedding in email template
 */
export function generateEmailContent(sections: { title?: string; content: string }[]): string {
  return sections.map(section => {
    let html = '';
    
    if (section.title) {
      html += `<h2 style="color: #123047; font-size: 20px; margin: 0 0 15px 0;">${section.title}</h2>`;
    }
    
    html += `<div style="color: #333; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">${section.content}</div>`;
    
    return html;
  }).join('');
}

/**
 * Format booking details as HTML table
 */
export function formatBookingDetailsHTML(details: Record<string, string>): string {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      ${Object.entries(details).map(([key, value]) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #555; width: 40%;">
            ${key}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333;">
            ${value}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

/**
 * Generate button for emails
 */
export function generateEmailButton(text: string, url: string): string {
  return `
    <div style="text-align: center; margin: 25px 0;">
      <a href="${url}" 
         style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Generate alert box for emails
 */
export function generateEmailAlert(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): string {
  const colors = {
    info: { bg: '#e0f2fe', border: '#0369a1', text: '#0c4a6e' },
    warning: { bg: '#fef3c7', border: '#d97706', text: '#78350f' },
    error: { bg: '#fee2e2', border: '#dc2626', text: '#7f1d1d' },
    success: { bg: '#d1fae5', border: '#059669', text: '#064e3b' }
  };
  
  const color = colors[type];
  
  return `
    <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: ${color.text}; font-size: 14px; line-height: 1.5;">
        ${message}
      </p>
    </div>
  `;
}
