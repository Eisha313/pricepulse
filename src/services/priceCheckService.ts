import { prisma } from '@/lib/db';
import { scrapePriceFromUrl } from '@/lib/priceScraper';
import { sendPriceAlertNotification } from '@/lib/notifications';
import { ProductRepository } from '@/repositories/productRepository';
import { AlertRepository } from '@/repositories/alertRepository';

export interface PriceCheckResult {
  productId: string;
  productName: string;
  previousPrice: number;
  currentPrice: number;
  priceChanged: boolean;
  alertsTriggered: number;
  error?: string;
}

export interface PriceCheckSummary {
  totalProducts: number;
  productsChecked: number;
  pricesChanged: number;
  alertsTriggered: number;
  errors: number;
  results: PriceCheckResult[];
  duration: number;
}

export class PriceCheckService {
  private productRepo: ProductRepository;
  private alertRepo: AlertRepository;

  constructor() {
    this.productRepo = new ProductRepository();
    this.alertRepo = new AlertRepository();
  }

  async checkAllPrices(): Promise<PriceCheckSummary> {
    const startTime = Date.now();
    const results: PriceCheckResult[] = [];

    const products = await prisma.product.findMany({
      where: {
        user: {
          OR: [
            { subscriptionStatus: 'active' },
            { subscriptionStatus: null },
          ],
        },
      },
      include: {
        user: true,
        alerts: {
          where: {
            isActive: true,
          },
        },
      },
    });

    for (const product of products) {
      const result = await this.checkProductPrice(product);
      results.push(result);
    }

    const summary: PriceCheckSummary = {
      totalProducts: products.length,
      productsChecked: results.filter((r) => !r.error).length,
      pricesChanged: results.filter((r) => r.priceChanged).length,
      alertsTriggered: results.reduce((sum, r) => sum + r.alertsTriggered, 0),
      errors: results.filter((r) => r.error).length,
      results,
      duration: Date.now() - startTime,
    };

    await this.logPriceCheckRun(summary);

    return summary;
  }

  async checkProductPrice(product: any): Promise<PriceCheckResult> {
    const result: PriceCheckResult = {
      productId: product.id,
      productName: product.name,
      previousPrice: product.currentPrice,
      currentPrice: product.currentPrice,
      priceChanged: false,
      alertsTriggered: 0,
    };

    try {
      const scrapedData = await scrapePriceFromUrl(product.url);

      if (!scrapedData.price) {
        result.error = 'Failed to scrape price';
        return result;
      }

      const newPrice = scrapedData.price;
      result.currentPrice = newPrice;
      result.priceChanged = newPrice !== product.currentPrice;

      if (result.priceChanged) {
        await this.updateProductPrice(product.id, newPrice, product.currentPrice);
      }

      // Check alerts
      const triggeredAlerts = await this.checkAndTriggerAlerts(
        product,
        newPrice
      );
      result.alertsTriggered = triggeredAlerts;

      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  private async updateProductPrice(
    productId: string,
    newPrice: number,
    previousPrice: number
  ): Promise<void> {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: {
          currentPrice: newPrice,
          lowestPrice: {
            set: Math.min(newPrice, previousPrice),
          },
          highestPrice: {
            set: Math.max(newPrice, previousPrice),
          },
          lastCheckedAt: new Date(),
        },
      }),
      prisma.priceHistory.create({
        data: {
          productId,
          price: newPrice,
        },
      }),
    ]);
  }

  private async checkAndTriggerAlerts(
    product: any,
    currentPrice: number
  ): Promise<number> {
    let triggeredCount = 0;

    for (const alert of product.alerts) {
      const shouldTrigger = this.shouldTriggerAlert(alert, currentPrice, product.currentPrice);

      if (shouldTrigger) {
        await this.triggerAlert(alert, product, currentPrice);
        triggeredCount++;
      }
    }

    return triggeredCount;
  }

  private shouldTriggerAlert(
    alert: any,
    currentPrice: number,
    previousPrice: number
  ): boolean {
    switch (alert.type) {
      case 'PRICE_DROP':
        return currentPrice < previousPrice;
      case 'TARGET_PRICE':
        return currentPrice <= alert.targetPrice;
      case 'PERCENTAGE_DROP':
        const percentageDrop = ((previousPrice - currentPrice) / previousPrice) * 100;
        return percentageDrop >= (alert.percentageThreshold || 10);
      default:
        return false;
    }
  }

  private async triggerAlert(
    alert: any,
    product: any,
    currentPrice: number
  ): Promise<void> {
    await sendPriceAlertNotification({
      userId: product.userId,
      productId: product.id,
      productName: product.name,
      productUrl: product.url,
      previousPrice: product.currentPrice,
      currentPrice,
      alertType: alert.type,
      targetPrice: alert.targetPrice,
    });

    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: {
          increment: 1,
        },
      },
    });
  }

  private async logPriceCheckRun(summary: PriceCheckSummary): Promise<void> {
    console.log('[PriceCheckService] Run completed:', {
      totalProducts: summary.totalProducts,
      productsChecked: summary.productsChecked,
      pricesChanged: summary.pricesChanged,
      alertsTriggered: summary.alertsTriggered,
      errors: summary.errors,
      duration: `${summary.duration}ms`,
    });
  }

  async checkSingleProduct(productId: string): Promise<PriceCheckResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        user: true,
        alerts: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!product) {
      return {
        productId,
        productName: 'Unknown',
        previousPrice: 0,
        currentPrice: 0,
        priceChanged: false,
        alertsTriggered: 0,
        error: 'Product not found',
      };
    }

    return this.checkProductPrice(product);
  }
}

export const priceCheckService = new PriceCheckService();
