import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapePrice, isValidProductUrl } from '@/lib/priceScraper';
import { apiErrorHandler } from '@/lib/apiErrorHandler';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }
    
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return errorResponse('URL is required', 400);
    }
    
    if (!isValidProductUrl(url)) {
      return errorResponse('Invalid URL format', 400);
    }
    
    const scrapedData = await scrapePrice(url);
    
    if (!scrapedData) {
      return errorResponse('Could not extract price from the provided URL. The site may not be supported or the page structure may have changed.', 422);
    }
    
    return successResponse(scrapedData);
  } catch (error) {
    return apiErrorHandler(error);
  }
}