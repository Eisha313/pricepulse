import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError, ApiErrorType } from '@/lib/apiResponse';
import { withErrorHandler } from '@/lib/apiErrorHandler';
import { alertSchema } from '@/lib/validations/alert';
import {
  requireAuth,
  isAuthError,
  parseJsonBody,
  isParseError,
  getPaginationParams,
  buildPaginationMeta,
  getSearchParam,
} from '@/lib/apiHelpers';
import { checkSubscriptionLimits } from '@/lib/subscription';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const pagination = getPaginationParams(request, { limit: 20 });
  const productId = getSearchParam(request, 'productId');
  const status = getSearchParam(request, 'status');

  const where: any = { userId: auth.userId };
  
  if (productId) {
    where.productId = productId;
  }
  
  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'triggered') {
    where.triggeredAt = { not: null };
  }

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            url: true,
            currentPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.alert.count({ where }),
  ]);

  return apiSuccess({
    alerts,
    pagination: buildPaginationMeta(total, pagination),
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const body = await parseJsonBody(request, alertSchema);
  if (isParseError(body)) return body;

  // Check subscription limits
  const limitCheck = await checkSubscriptionLimits(auth.userId, 'alerts');
  if (!limitCheck.allowed) {
    return apiError(limitCheck.message, ApiErrorType.FORBIDDEN);
  }

  // Verify product ownership
  const product = await prisma.product.findFirst({
    where: {
      id: body.productId,
      userId: auth.userId,
    },
  });

  if (!product) {
    return apiError('Product not found', ApiErrorType.NOT_FOUND);
  }

  const alert = await prisma.alert.create({
    data: {
      productId: body.productId,
      userId: auth.userId,
      targetPrice: body.targetPrice,
      type: body.type || 'PRICE_DROP',
      isActive: true,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
    },
  });

  return apiSuccess(alert, 201);
});
