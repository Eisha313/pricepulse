import { NextResponse } from 'next/server';
import { checkAllPrices } from '@/services/priceCheckService';
import { cronConfig, verifyCronSecret } from '@/lib/cronConfig';
import { apiError, apiSuccess } from '@/lib/apiResponse';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for Vercel

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron or has valid secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = authHeader?.replace('Bearer ', '');

    if (!verifyCronSecret(cronSecret || '')) {
      console.warn('Unauthorized cron request attempt');
      return apiError('Unauthorized', 401);
    }

    if (!cronConfig.enabled) {
      return apiSuccess({ message: 'Price checking is disabled' });
    }

    console.log('Starting scheduled price check...');
    const startTime = Date.now();

    const result = await checkAllPrices();

    const duration = Date.now() - startTime;
    console.log(`Price check completed in ${duration}ms:`, {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      priceDrops: result.priceDrops
    });

    // Log failed checks for debugging
    const failures = result.results.filter(r => !r.success);
    if (failures.length > 0) {
      console.warn('Failed price checks:', failures.map(f => ({
        productId: f.productId,
        error: f.error
      })));
    }

    return apiSuccess({
      message: 'Price check completed',
      duration: `${duration}ms`,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        priceDrops: result.priceDrops
      }
    });
  } catch (error) {
    console.error('Cron price check error:', error);
    return apiError(
      error instanceof Error ? error.message : 'Price check failed',
      500
    );
  }
}

// Allow POST for manual triggers from admin panel
export async function POST(request: Request) {
  return GET(request);
}