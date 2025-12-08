import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError, ApiErrorCode } from '@/lib/apiResponse';
import { createApiHandler, ApiContext } from '@/lib/apiMiddleware';
import { alertSchema, AlertInput } from '@/lib/validations/alert';

async function handleGet(req: NextRequest, context: ApiContext) {
  const userId = context.session!.user.id;
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  const whereClause: Record<string, unknown> = {
    product: { userId },
  };

  if (productId) {
    whereClause.productId = productId;
  }

  const alerts = await prisma.alert.findMany({
    where: whereClause,
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
  });

  return apiSuccess(alerts);
}

async function handlePost(req: NextRequest, context: ApiContext<AlertInput>) {
  const userId = context.session!.user.id;
  const { productId, targetPrice, notifyEmail, notifyPush } = context.body!;

  // Verify product belongs to user
  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
  });

  if (!product) {
    return apiError(
      'Product not found',
      ApiErrorCode.NOT_FOUND,
      404
    );
  }

  // Check for existing alert with same target price
  const existingAlert = await prisma.alert.findFirst({
    where: {
      productId,
      targetPrice,
      isActive: true,
    },
  });

  if (existingAlert) {
    return apiError(
      'An alert with this target price already exists',
      ApiErrorCode.VALIDATION_ERROR,
      400
    );
  }

  const alert = await prisma.alert.create({
    data: {
      productId,
      targetPrice,
      notifyEmail: notifyEmail ?? true,
      notifyPush: notifyPush ?? false,
    },
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
  });

  return apiSuccess(alert, 201);
}

const handlers = createApiHandler<AlertInput>(
  {
    GET: handleGet,
    POST: handlePost,
  },
  {
    requireAuth: true,
    checkSubscription: true,
    bodySchema: alertSchema,
    rateLimit: {
      requests: 30,
      window: 60,
    },
  }
);

export const { GET, POST } = handlers;