import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiError, ApiErrorCode } from '@/lib/apiResponse';
import { checkSubscriptionLimits } from '@/lib/subscription';
import { ZodSchema } from 'zod';

export type ApiHandler<T = unknown> = (
  req: NextRequest,
  context: ApiContext<T>
) => Promise<NextResponse>;

export interface ApiContext<T = unknown> {
  params?: Record<string, string>;
  session?: {
    user: {
      id: string;
      email: string;
      name?: string;
    };
  } | null;
  body?: T;
}

export interface MiddlewareOptions<T = unknown> {
  requireAuth?: boolean;
  checkSubscription?: boolean;
  bodySchema?: ZodSchema<T>;
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = identifier;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  
  existing.count++;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export function withMiddleware<T = unknown>(
  handler: ApiHandler<T>,
  options: MiddlewareOptions<T> = {}
): (req: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse> {
  return async (req: NextRequest, routeContext?: { params?: Record<string, string> }) => {
    try {
      const context: ApiContext<T> = {
        params: routeContext?.params,
      };

      // Rate limiting
      if (options.rateLimit) {
        const identifier = req.headers.get('x-forwarded-for') || 
                          req.headers.get('x-real-ip') || 
                          'anonymous';
        const { allowed, remaining, resetAt } = checkRateLimit(
          identifier,
          options.rateLimit.requests,
          options.rateLimit.window
        );

        if (!allowed) {
          const response = apiError(
            'Too many requests',
            ApiErrorCode.RATE_LIMITED,
            429
          );
          response.headers.set('X-RateLimit-Remaining', '0');
          response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
          return response;
        }
      }

      // Authentication check
      if (options.requireAuth) {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
          return apiError(
            'Authentication required',
            ApiErrorCode.UNAUTHORIZED,
            401
          );
        }
        
        context.session = session as ApiContext['session'];
      }

      // Subscription limits check
      if (options.checkSubscription && context.session?.user) {
        const { canCreate, reason } = await checkSubscriptionLimits(
          context.session.user.id
        );
        
        if (!canCreate) {
          return apiError(
            reason || 'Subscription limit reached',
            ApiErrorCode.FORBIDDEN,
            403
          );
        }
      }

      // Body validation
      if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
        try {
          const rawBody = await req.json();
          const validatedBody = options.bodySchema.parse(rawBody);
          context.body = validatedBody;
        } catch (error) {
          return apiError(
            'Invalid request body',
            ApiErrorCode.VALIDATION_ERROR,
            400
          );
        }
      }

      return await handler(req, context);
    } catch (error) {
      console.error('API middleware error:', error);
      return apiError(
        'Internal server error',
        ApiErrorCode.INTERNAL_ERROR,
        500
      );
    }
  };
}

export function createApiHandler<T = unknown>(
  handlers: {
    GET?: ApiHandler<T>;
    POST?: ApiHandler<T>;
    PUT?: ApiHandler<T>;
    PATCH?: ApiHandler<T>;
    DELETE?: ApiHandler<T>;
  },
  options: MiddlewareOptions<T> = {}
) {
  const wrappedHandlers: Record<string, (req: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse>> = {};

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      wrappedHandlers[method] = withMiddleware(handler, options);
    }
  }

  return wrappedHandlers;
}