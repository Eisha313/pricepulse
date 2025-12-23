import { NextRequest, NextResponse } from 'next/server';
import { priceCheckService } from '@/services/priceCheckService';
import { cronConfig, validateCronSecret } from '@/lib/cronConfig';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    // Validate cron secret for security
    const authHeader = request.headers.get('authorization');
    if (!validateCronSecret(authHeader)) {
      return errorResponse('Unauthorized', 401);
    }

    console.log('[Cron] Starting price check job...');

    const summary = await priceCheckService.checkAllPrices();

    console.log('[Cron] Price check job completed:', {
      totalProducts: summary.totalProducts,
      productsChecked: summary.productsChecked,
      pricesChanged: summary.pricesChanged,
      alertsTriggered: summary.alertsTriggered,
      errors: summary.errors,
      duration: `${summary.duration}ms`,
    });

    return successResponse({
      message: 'Price check completed',
      summary: {
        totalProducts: summary.totalProducts,
        productsChecked: summary.productsChecked,
        pricesChanged: summary.pricesChanged,
        alertsTriggered: summary.alertsTriggered,
        errors: summary.errors,
        duration: summary.duration,
      },
    });
  } catch (error) {
    console.error('[Cron] Price check job failed:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Price check failed',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow manual triggering with authentication
  try {
    const authHeader = request.headers.get('authorization');
    if (!validateCronSecret(authHeader)) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json().catch(() => ({}));
    const { productId } = body;

    if (productId) {
      // Check single product
      const result = await priceCheckService.checkSingleProduct(productId);
      return successResponse({
        message: 'Single product price check completed',
        result,
      });
    }

    // Check all products
    const summary = await priceCheckService.checkAllPrices();
    return successResponse({
      message: 'Price check completed',
      summary: {
        totalProducts: summary.totalProducts,
        productsChecked: summary.productsChecked,
        pricesChanged: summary.pricesChanged,
        alertsTriggered: summary.alertsTriggered,
        errors: summary.errors,
        duration: summary.duration,
      },
    });
  } catch (error) {
    console.error('[Cron] Manual price check failed:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Price check failed',
      500
    );
  }
}
