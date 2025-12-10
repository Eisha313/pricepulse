import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeProduct } from '@/lib/priceScraper';
import { successResponse, errorResponse, rateLimitResponse } from '@/lib/apiResponse';
import { validateUrl } from '@/lib/validations/url';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return errorResponse('Authentication required', 401);
    }

    // Check rate limit
    if (!checkRateLimit(session.user.id)) {
      return rateLimitResponse();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body || typeof body !== 'object' || !('url' in body)) {
      return errorResponse('URL is required', 400);
    }

    const { url } = body as { url: unknown };

    if (typeof url !== 'string') {
      return errorResponse('URL must be a string', 400);
    }

    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return errorResponse(urlValidation.error || 'Invalid URL', 400);
    }

    const result = await scrapeProduct(url);

    if (result.success && result.data) {
      return successResponse(result.data, 'Product scraped successfully');
    }

    return errorResponse(
      result.error || 'Failed to scrape product',
      422 // Unprocessable Entity
    );
  } catch (error) {
    console.error('Scrape API error:', error);
    return errorResponse('Internal server error', 500);
  }
}