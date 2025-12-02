import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapePrice, isValidProductUrl, ScrapeResult } from '@/lib/priceScraper';
import { apiResponse, ApiError } from '@/lib/apiResponse';
import { withErrorHandler } from '@/lib/apiErrorHandler';
import { z } from 'zod';

const scrapeRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

async function handler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new ApiError('Unauthorized', 401);
  }

  // Rate limiting
  if (!checkRateLimit(session.user.id)) {
    throw new ApiError('Rate limit exceeded. Please wait before trying again.', 429);
  }

  const body = await request.json();
  const validation = scrapeRequestSchema.safeParse(body);

  if (!validation.success) {
    throw new ApiError(validation.error.errors[0].message, 400);
  }

  const { url } = validation.data;

  // Additional URL validation
  if (!isValidProductUrl(url)) {
    throw new ApiError('Invalid or unsupported URL', 400);
  }

  // Block localhost and private IPs
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.endsWith('.local')
    ) {
      throw new ApiError('URLs pointing to local or private networks are not allowed', 400);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Invalid URL', 400);
  }

  const result: ScrapeResult = await scrapePrice(url);

  if (!result.success) {
    const statusCode = result.retryable ? 503 : 400;
    throw new ApiError(result.error || 'Failed to scrape price', statusCode);
  }

  return apiResponse({
    price: result.data!.price,
    currency: result.data!.currency,
    title: result.data!.title,
    imageUrl: result.data!.imageUrl,
    available: result.data!.available,
    scrapedAt: new Date().toISOString(),
  });
}

export const POST = withErrorHandler(handler);
