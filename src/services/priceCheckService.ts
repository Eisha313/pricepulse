import { db } from '@/lib/db';
import { scrapePrice } from '@/lib/priceScraper';
import { sendPriceDropNotification } from '@/lib/notifications';
import { formatPrice } from '@/lib/priceUtils';

interface PriceCheckResult {
  productId: string;
  success: boolean;
  oldPrice?: number;
  newPrice?: number;
  error?: string;
}

interface PriceCheckSummary {
  total: number;
  successful: number;
  failed: number;
  priceDrops: number;
  results: PriceCheckResult[];
}

const BATCH_SIZE = 5;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function acquireLock(productId: string): Promise<boolean> {
  const lockKey = `price_check_lock_${productId}`;
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_TIMEOUT_MS);

  try {
    // Try to acquire lock using atomic update
    const result = await db.product.updateMany({
      where: {
        id: productId,
        OR: [
          { lockedUntil: null },
          { lockedUntil: { lt: now } }
        ]
      },
      data: {
        lockedUntil: lockExpiry
      }
    });

    return result.count > 0;
  } catch (error) {
    console.error(`Failed to acquire lock for product ${productId}:`, error);
    return false;
  }
}

async function releaseLock(productId: string): Promise<void> {
  try {
    await db.product.update({
      where: { id: productId },
      data: { lockedUntil: null }
    });
  } catch (error) {
    console.error(`Failed to release lock for product ${productId}:`, error);
  }
}

async function checkPriceWithRetry(
  productId: string,
  url: string,
  attempts: number = RETRY_ATTEMPTS
): Promise<{ price: number | null; error?: string }> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await scrapePrice(url);
      
      if (result.success && result.price !== null) {
        return { price: result.price };
      }
      
      if (attempt < attempts) {
        console.log(`Retry ${attempt}/${attempts} for product ${productId}`);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    } catch (error) {
      if (attempt < attempts) {
        console.log(`Error on attempt ${attempt}/${attempts} for product ${productId}:`, error);
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        return { 
          price: null, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
  }
  
  return { price: null, error: 'Max retry attempts reached' };
}

async function checkSingleProduct(productId: string): Promise<PriceCheckResult> {
  // Try to acquire lock to prevent concurrent checks
  const lockAcquired = await acquireLock(productId);
  
  if (!lockAcquired) {
    return {
      productId,
      success: false,
      error: 'Could not acquire lock - another check may be in progress'
    };
  }

  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        alerts: {
          where: { active: true },
          include: { user: true }
        }
      }
    });

    if (!product) {
      return {
        productId,
        success: false,
        error: 'Product not found'
      };
    }

    const oldPrice = product.currentPrice?.toNumber() ?? null;
    const { price: newPrice, error } = await checkPriceWithRetry(productId, product.url);

    if (newPrice === null) {
      // Update failure count for monitoring
      await db.product.update({
        where: { id: productId },
        data: {
          lastCheckFailed: true,
          failureCount: { increment: 1 },
          lastChecked: new Date()
        }
      });

      return {
        productId,
        success: false,
        oldPrice: oldPrice ?? undefined,
        error: error || 'Failed to fetch price'
      };
    }

    // Update product with new price - use transaction for consistency
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          currentPrice: newPrice,
          lastChecked: new Date(),
          lastCheckFailed: false,
          failureCount: 0
        }
      });

      await tx.priceHistory.create({
        data: {
          productId,
          price: newPrice
        }
      });
    });

    // Check for price drops and notify users
    let priceDropped = false;
    if (oldPrice !== null && newPrice < oldPrice) {
      priceDropped = true;
      
      for (const alert of product.alerts) {
        if (newPrice <= alert.targetPrice.toNumber()) {
          try {
            await sendPriceDropNotification({
              userEmail: alert.user.email!,
              productName: product.name,
              productUrl: product.url,
              oldPrice: formatPrice(oldPrice),
              newPrice: formatPrice(newPrice),
              targetPrice: formatPrice(alert.targetPrice.toNumber())
            });

            // Mark alert as triggered
            await db.alert.update({
              where: { id: alert.id },
              data: { 
                lastTriggered: new Date(),
                triggerCount: { increment: 1 }
              }
            });
          } catch (notificationError) {
            console.error(`Failed to send notification for alert ${alert.id}:`, notificationError);
          }
        }
      }
    }

    return {
      productId,
      success: true,
      oldPrice: oldPrice ?? undefined,
      newPrice
    };
  } finally {
    // Always release the lock
    await releaseLock(productId);
  }
}

export async function checkAllPrices(): Promise<PriceCheckSummary> {
  const products = await db.product.findMany({
    where: {
      alerts: {
        some: { active: true }
      },
      // Skip products with too many recent failures
      OR: [
        { failureCount: { lt: 5 } },
        { lastChecked: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    },
    select: { id: true }
  });

  const results: PriceCheckResult[] = [];
  let priceDrops = 0;

  // Process in batches to avoid overwhelming external services
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(product => checkSingleProduct(product.id))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success && 
            result.value.oldPrice !== undefined && 
            result.value.newPrice !== undefined &&
            result.value.newPrice < result.value.oldPrice) {
          priceDrops++;
        }
      } else {
        results.push({
          productId: 'unknown',
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < products.length) {
      await sleep(500);
    }
  }

  return {
    total: products.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    priceDrops,
    results
  };
}

export async function checkProductPrice(productId: string): Promise<PriceCheckResult> {
  return checkSingleProduct(productId);
}

export { type PriceCheckResult, type PriceCheckSummary };