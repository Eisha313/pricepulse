import { env } from './env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PriceAlertEmailData {
  userName: string;
  productName: string;
  productUrl: string;
  originalPrice: number;
  currentPrice: number;
  targetPrice: number;
  currency?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options;

  // Using Resend as email provider
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'PricePulse <alerts@pricepulse.app>',
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export function generatePriceAlertEmail(data: PriceAlertEmailData): { subject: string; html: string } {
  const { userName, productName, productUrl, originalPrice, currentPrice, targetPrice, currency = '$' } = data;
  const savings = originalPrice - currentPrice;
  const savingsPercent = Math.round((savings / originalPrice) * 100);

  const subject = `🎉 Price Drop Alert: ${productName} is now ${currency}${currentPrice.toFixed(2)}!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Drop Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 Price Drop Alert!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi ${userName},</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">Great news! A product you're tracking has dropped below your target price.</p>
              
              <!-- Product Card -->
              <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">${productName}</h2>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Original Price:</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #9ca3af; font-size: 14px; text-decoration: line-through;">${currency}${originalPrice.toFixed(2)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Your Target:</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #6b7280; font-size: 14px;">${currency}${targetPrice.toFixed(2)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #059669; font-size: 16px; font-weight: 600;">Current Price:</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #059669; font-size: 20px; font-weight: 700;">${currency}${currentPrice.toFixed(2)}</span>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="margin-top: 16px; padding: 12px; background-color: #d1fae5; border-radius: 6px; text-align: center;">
                      <span style="color: #065f46; font-size: 14px; font-weight: 600;">You save ${currency}${savings.toFixed(2)} (${savingsPercent}% off!)</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${productUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Buy Now →</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">Prices may change. We recommend acting quickly!</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Powered by <strong>PricePulse</strong></p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">You're receiving this because you set up a price alert.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

export async function sendPriceAlertEmail(
  email: string,
  data: PriceAlertEmailData
): Promise<boolean> {
  const { subject, html } = generatePriceAlertEmail(data);
  return sendEmail({ to: email, subject, html });
}
