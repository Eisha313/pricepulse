import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapePriceFromUrl } from '@/lib/priceScraper';
import { sendPriceAlertEmail } from '@/lib/email';
import { apiResponse, apiError } from '@/lib/apiResponse';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from our cron service
    if (!verifyCronSecret(request)) {
      return apiError('Unauthorized', 401);
    }

    console.log('[Cron] Starting price check job...');
    
    // Get all active products with alerts
    const products = await db.product.findMany({
      where: {
        alerts: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        alerts: {
          where: {
            isActive: true,
          },
          include: {
            user: true,
          },
        },
        user: true,
      },
    });

    console.log(`[Cron] Found ${products.length} products to check`);

    const results = {
      checked: 0,
      updated: 0,
      alertsTriggered: 0,
      errors: 0,
    };

    for (const product of products) {
      try {
        results.checked++;
        
        // Scrape current price
        const scrapeResult = await scrapePriceFromUrl(product.url);
        
        if (!scrapeResult.success || scrapeResult.price === null) {
          console.error(`[Cron] Failed to scrape price for product ${product.id}`);
          results.errors++;
          continue;
        }

        const newPrice = scrapeResult.price;
        const previousPrice = product.currentPrice;

        // Update product price if changed
        if (newPrice !== previousPrice) {
          await db.product.update({
            where: { id: product.id },
            data: {
              currentPrice: newPrice,
              lowestPrice: Math.min(product.lowestPrice || newPrice, newPrice),
              highestPrice: Math.max(product.highestPrice || newPrice, newPrice),
              lastCheckedAt: new Date(),
            },
          });

          // Add price history entry
          await db.priceHistory.create({
            data: {
              productId: product.id,
              price: newPrice,
            },
          });

          results.updated++;
          console.log(`[Cron] Updated price for ${product.name}: ${previousPrice} -> ${newPrice}`);
        } else {
          // Just update lastCheckedAt
          await db.product.update({
            where: { id: product.id },
            data: { lastCheckedAt: new Date() },
          });
        }

        // Check alerts
        for (const alert of product.alerts) {
          const shouldTrigger = checkAlertCondition(alert, newPrice, previousPrice);
          
          if (shouldTrigger) {
            // Send notification
            await sendPriceAlertEmail(
              alert.user.email!,
              product.name,
              newPrice,
              alert.targetPrice,
              product.url
            );

            // Update alert
            await db.alert.update({
              where: { id: alert.id },
              data: {
                lastTriggeredAt: new Date(),
                isActive: false, // Deactivate after triggering
              },
            });

            results.alertsTriggered++;
            console.log(`[Cron] Triggered alert ${alert.id} for user ${alert.userId}`);
          }
        }

        // Rate limiting - wait between requests
        await sleep(1000);
      } catch (error) {
        console.error(`[Cron] Error processing product ${product.id}:`, error);
        results.errors++;
      }
    }

    console.log('[Cron] Price check job completed:', results);

    return apiResponse({
      message: 'Price check completed',
      results,
    });
  } catch (error) {
    console.error('[Cron] Price check job failed:', error);
    return apiError('Price check job failed', 500);
  }
}

interface Alert {
  type: string;
  targetPrice: number;
}

function checkAlertCondition(
  alert: Alert,
  currentPrice: number,
  previousPrice: number | null
): boolean {
  switch (alert.type) {
    case 'PRICE_DROP':
      return currentPrice <= alert.targetPrice;
    
    case 'PRICE_CHANGE':
      if (previousPrice === null) return false;
      const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
      return changePercent >= alert.targetPrice;
    
    case 'BACK_IN_STOCK':
      // For now, just check if we got a valid price
      return currentPrice > 0;
    
    default:
      return currentPrice <= alert.targetPrice;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
