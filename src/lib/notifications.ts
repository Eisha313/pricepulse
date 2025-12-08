import { db } from './db';
import { sendEmail } from './email';

export interface PriceAlert {
  id: string;
  userId: string;
  productId: string;
  targetPrice: number;
  isActive: boolean;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    url: string;
    currentPrice: number | null;
    imageUrl: string | null;
  };
  user: {
    email: string;
    name: string | null;
  };
}

export async function checkPriceAlerts(): Promise<void> {
  try {
    const activeAlerts = await db.alert.findMany({
      where: {
        isActive: true,
      },
      include: {
        product: true,
        user: true,
      },
    });

    for (const alert of activeAlerts) {
      await processAlert(alert as unknown as PriceAlert);
    }
  } catch (error) {
    console.error('Error checking price alerts:', error);
    throw error;
  }
}

async function processAlert(alert: PriceAlert): Promise<void> {
  const { product, user, targetPrice } = alert;

  // Skip if product has no current price
  if (product.currentPrice === null || product.currentPrice === undefined) {
    console.log(`Skipping alert ${alert.id}: product has no current price`);
    return;
  }

  // Ensure we're comparing numbers correctly
  const currentPrice = Number(product.currentPrice);
  const target = Number(targetPrice);

  if (isNaN(currentPrice) || isNaN(target)) {
    console.error(`Invalid price values for alert ${alert.id}: current=${product.currentPrice}, target=${targetPrice}`);
    return;
  }

  // Use <= for comparison to catch exact matches
  if (currentPrice <= target) {
    await sendPriceDropNotification(alert, currentPrice);
    
    // Deactivate alert after notification
    await db.alert.update({
      where: { id: alert.id },
      data: { isActive: false },
    });
  }
}

async function sendPriceDropNotification(
  alert: PriceAlert,
  currentPrice: number
): Promise<void> {
  const { product, user, targetPrice } = alert;
  
  const savings = targetPrice - currentPrice;
  const savingsText = savings > 0 
    ? `That's $${savings.toFixed(2)} below your target!` 
    : `It's now at your target price!`;

  await sendEmail({
    to: user.email,
    subject: `🎉 Price Drop Alert: ${product.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Price Drop Alert!</h1>
        <p>Great news${user.name ? `, ${user.name}` : ''}!</p>
        <p>The price of <strong>${product.name}</strong> has dropped to <strong>$${currentPrice.toFixed(2)}</strong>.</p>
        <p>Your target price was <strong>$${Number(targetPrice).toFixed(2)}</strong>. ${savingsText}</p>
        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" style="max-width: 200px; margin: 20px 0;" />` : ''}
        <a href="${product.url}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Buy Now</a>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This alert has been automatically deactivated. You can create a new alert from your dashboard.</p>
      </div>
    `,
    text: `Price Drop Alert! ${product.name} is now $${currentPrice.toFixed(2)} (your target: $${Number(targetPrice).toFixed(2)}). Buy now: ${product.url}`,
  });
}

export async function createAlertNotification(
  userId: string,
  productId: string,
  targetPrice: number
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  const product = await db.product.findUnique({
    where: { id: productId },
  });

  if (!user || !product) {
    throw new Error('User or product not found');
  }

  // Check if current price is already at or below target
  if (product.currentPrice !== null && Number(product.currentPrice) <= Number(targetPrice)) {
    await sendEmail({
      to: user.email,
      subject: `🎉 Good news about ${product.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Already on Sale!</h1>
          <p>Hey${user.name ? ` ${user.name}` : ''},</p>
          <p>The product you just set an alert for is already at or below your target price!</p>
          <p><strong>${product.name}</strong> is currently <strong>$${Number(product.currentPrice).toFixed(2)}</strong> (your target: $${Number(targetPrice).toFixed(2)}).</p>
          <a href="${product.url}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Buy Now</a>
        </div>
      `,
      text: `Good news! ${product.name} is already $${Number(product.currentPrice).toFixed(2)} (your target: $${Number(targetPrice).toFixed(2)}). Buy now: ${product.url}`,
    });
  }
}