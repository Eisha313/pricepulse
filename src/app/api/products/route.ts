import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '@/lib/apiResponse';
import { withErrorHandler, ValidationError } from '@/lib/apiErrorHandler';

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const products = await prisma.product.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      alerts: true,
      priceHistory: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return successResponse(products);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { url, name, targetPrice } = body;

  // Validate required fields
  const errors: Record<string, string[]> = {};
  
  if (!url || typeof url !== 'string') {
    errors.url = ['URL is required'];
  } else if (!isValidUrl(url)) {
    errors.url = ['Invalid URL format'];
  }

  if (!name || typeof name !== 'string') {
    errors.name = ['Product name is required'];
  }

  if (targetPrice !== undefined && (typeof targetPrice !== 'number' || targetPrice < 0)) {
    errors.targetPrice = ['Target price must be a positive number'];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  // Check product limit for non-premium users
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPremium: true },
  });

  if (!user?.isPremium) {
    const productCount = await prisma.product.count({
      where: { userId: session.user.id },
    });

    if (productCount >= 5) {
      return badRequestResponse(
        'Free users can only track up to 5 products. Upgrade to premium for unlimited tracking.'
      );
    }
  }

  const product = await prisma.product.create({
    data: {
      url,
      name,
      targetPrice,
      userId: session.user.id,
    },
  });

  return successResponse(product, 'Product created successfully', 201);
});

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
