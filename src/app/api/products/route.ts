import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError, ApiErrorType } from '@/lib/apiResponse';
import { withErrorHandler } from '@/lib/apiErrorHandler';
import { productSchema } from '@/lib/validations/product';
import {
  requireAuth,
  isAuthError,
  parseJsonBody,
  isParseError,
  getPaginationParams,
  buildPaginationMeta,
} from '@/lib/apiHelpers';
import { checkSubscriptionLimits } from '@/lib/subscription';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const pagination = getPaginationParams(request, { limit: 20 });

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { userId: auth.userId },
      include: {
        alerts: true,
        priceHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.product.count({
      where: { userId: auth.userId },
    }),
  ]);

  return apiSuccess({
    products,
    pagination: buildPaginationMeta(total, pagination),
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const body = await parseJsonBody(request, productSchema);
  if (isParseError(body)) return body;

  // Check subscription limits
  const limitCheck = await checkSubscriptionLimits(auth.userId, 'products');
  if (!limitCheck.allowed) {
    return apiError(limitCheck.message, ApiErrorType.FORBIDDEN);
  }

  const product = await prisma.product.create({
    data: {
      url: body.url,
      name: body.name,
      targetPrice: body.targetPrice,
      userId: auth.userId,
    },
    include: {
      alerts: true,
    },
  });

  return apiSuccess(product, 201);
});
