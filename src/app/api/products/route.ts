import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError, ApiErrorCode } from '@/lib/apiResponse';
import { createApiHandler, ApiContext } from '@/lib/apiMiddleware';
import { productSchema, ProductInput } from '@/lib/validations/product';
import { scrapePrice } from '@/lib/priceScraper';

async function handleGet(req: NextRequest, context: ApiContext) {
  const userId = context.session!.user.id;

  const products = await prisma.product.findMany({
    where: { userId },
    include: {
      alerts: true,
      priceHistory: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return apiSuccess(products);
}

async function handlePost(req: NextRequest, context: ApiContext<ProductInput>) {
  const userId = context.session!.user.id;
  const { url, name, targetPrice } = context.body!;

  // Check if product already exists for this user
  const existingProduct = await prisma.product.findFirst({
    where: { url, userId },
  });

  if (existingProduct) {
    return apiError(
      'You are already tracking this product',
      ApiErrorCode.VALIDATION_ERROR,
      400
    );
  }

  // Scrape initial price
  let currentPrice: number | null = null;
  let scrapedName: string | null = null;

  try {
    const scrapeResult = await scrapePrice(url);
    if (scrapeResult) {
      currentPrice = scrapeResult.price;
      scrapedName = scrapeResult.title;
    }
  } catch (error) {
    console.error('Failed to scrape initial price:', error);
  }

  const product = await prisma.product.create({
    data: {
      url,
      name: name || scrapedName || 'Unknown Product',
      targetPrice,
      currentPrice,
      userId,
      priceHistory: currentPrice
        ? {
            create: {
              price: currentPrice,
            },
          }
        : undefined,
    },
    include: {
      priceHistory: true,
    },
  });

  return apiSuccess(product, 201);
}

const handlers = createApiHandler<ProductInput>(
  {
    GET: handleGet,
    POST: handlePost,
  },
  {
    requireAuth: true,
    checkSubscription: true,
    bodySchema: productSchema,
    rateLimit: {
      requests: 30,
      window: 60,
    },
  }
);

export const { GET, POST } = handlers;