import { db } from '@/lib/db';
import { scrapePriceFromUrl } from '@/lib/priceScraper';
import { sendPriceAlertEmail } from '@/lib/email';
import { sendNotification } from '@/lib/notifications';

export interface PriceCheckResult {
  productId: string;
  previousPrice: number | null;
  currentPrice: number | null;
  alertsTriggered: number;
  error?: string;
}

export async function checkProductPrice(productId: string): Promise<PriceCheckResult> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      alerts: {
        where: { isActive: true },
        include: { user: true },
      },
      user: true,
    },
  });

  if (!product) {
    return {
      productId,
      previousPrice: null,
      currentPrice: null,
      alertsTriggered: 0,
      error: 'Product not found',
    };
  }

  const previousPrice = product.currentPrice;

  try {
    const scrapedData = await scrapePriceFromUrl(product.url);
    
    // Handle null or invalid scraped price
    if (scrapedData.price === null || scrapedData.price === undefined || isNaN(scrapedData.price)) {
      console.warn(`Invalid price scraped for product ${productId}: ${scrapedData.price}`);
      return {
        productId,
        previousPrice: previousPrice ? Number(previousPrice) : null,
        currentPrice: null,
        alertsTriggered: 0,
        error: 'Invalid price scraped',
      };
    }

    const currentPrice = Number(scrapedData.price);
    
    // Validate the price is a reasonable number
    if (currentPrice <= 0 || currentPrice > 1000000) {
      console.warn(`Unreasonable price for product ${productId}: ${currentPrice}`);
      return {
        productId,
        previousPrice: previousPrice ? Number(previousPrice) : null,
        currentPrice: null,
        alertsTriggered: 0,
        error: 'Unreasonable price value',
      };
    }

    // Update product with new price
    await db.product.update({
      where: { id: productId },
      data: {
        currentPrice,
        lastChecked: new Date(),
      },
    });

    // Record price history
    await db.priceHistory.create({
      data: {
        productId,
        price: currentPrice,
      },
    });

    // Check alerts - ensure we're comparing valid numbers
    let alertsTriggered = 0;
    for (const alert of product.alerts) {
      const targetPrice = alert.targetPrice ? Number(alert.targetPrice) : null;
      
      if (targetPrice === null || isNaN(targetPrice)) {
        console.warn(`Invalid target price for alert ${alert.id}`);
        continue;
      }

      if (currentPrice <= targetPrice) {
        alertsTriggered++;

        // Send notifications
        if (alert.user.email) {
          await sendPriceAlertEmail({
            to: alert.user.email,
            productName: product.name,
            currentPrice,
            targetPrice,
            productUrl: product.url,
          });
        }

        await sendNotification({
          userId: alert.userId,
          type: 'PRICE_DROP',
          title: 'Price Alert!',
          message: `${product.name} has dropped to $${currentPrice.toFixed(2)}`,
          productId: product.id,
        });

        // Optionally deactivate the alert after triggering
        await db.alert.update({
          where: { id: alert.id },
          data: { isActive: false, triggeredAt: new Date() },
        });
      }
    }

    return {
      productId,
      previousPrice: previousPrice ? Number(previousPrice) : null,
      currentPrice,
      alertsTriggered,
    };
  } catch (error) {
    console.error(`Error checking price for product ${productId}:`, error);
    return {
      productId,
      previousPrice: previousPrice ? Number(previousPrice) : null,
      currentPrice: null,
      alertsTriggered: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkAllProductPrices(): Promise<PriceCheckResult[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const results: PriceCheckResult[] = [];

  for (const product of products) {
    const result = await checkProductPrice(product.id);
    results.push(result);
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
