import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeProduct, isSupportedUrl } from '@/lib/priceScraper';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { validateUrl } from '@/lib/validations/url';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }
    
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    if (!body || typeof body !== 'object') {
      return errorResponse('Request body must be an object', 400);
    }
    
    const { url } = body as { url?: unknown };
    
    if (!url || typeof url !== 'string') {
      return errorResponse('URL is required and must be a string', 400);
    }
    
    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return errorResponse(urlValidation.error || 'Invalid URL', 400);
    }
    
    if (!isSupportedUrl(url)) {
      return errorResponse(
        'This website is not currently supported. We support Amazon, eBay, Walmart, Target, and Best Buy.',
        400
      );
    }
    
    const result = await scrapeProduct(url);
    
    if (!result.success || !result.data) {
      return errorResponse(
        result.error || 'Failed to scrape product information',
        422
      );
    }
    
    return successResponse(result.data);
  } catch (error) {
    console.error('Scrape API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
