import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiError, ApiErrorType } from '@/lib/apiResponse';
import { ZodSchema, ZodError } from 'zod';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
}

export async function requireAuth(): Promise<AuthenticatedRequest | Response> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return apiError('Authentication required', ApiErrorType.UNAUTHORIZED);
  }
  
  return {
    userId: session.user.id,
    email: session.user.email || '',
  };
}

export function isAuthError(result: AuthenticatedRequest | Response): result is Response {
  return result instanceof Response;
}

export async function parseJsonBody<T>(
  request: NextRequest,
  schema?: ZodSchema<T>
): Promise<T | Response> {
  try {
    const body = await request.json();
    
    if (schema) {
      const result = schema.safeParse(body);
      if (!result.success) {
        return apiError(
          formatZodErrors(result.error),
          ApiErrorType.VALIDATION
        );
      }
      return result.data;
    }
    
    return body as T;
  } catch (error) {
    return apiError('Invalid JSON body', ApiErrorType.VALIDATION);
  }
}

export function isParseError<T>(result: T | Response): result is Response {
  return result instanceof Response;
}

export function formatZodErrors(error: ZodError): string {
  return error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
}

export function getSearchParam(
  request: NextRequest,
  param: string
): string | null {
  return request.nextUrl.searchParams.get(param);
}

export function getSearchParamNumber(
  request: NextRequest,
  param: string,
  defaultValue?: number
): number | null {
  const value = request.nextUrl.searchParams.get(param);
  if (value === null) {
    return defaultValue ?? null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? (defaultValue ?? null) : parsed;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationParams(
  request: NextRequest,
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const page = getSearchParamNumber(request, 'page', defaults.page ?? 1) || 1;
  const limit = getSearchParamNumber(request, 'limit', defaults.limit ?? 10) || 10;
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
} {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    total,
    page: params.page,
    limit: params.limit,
    totalPages,
    hasMore: params.page < totalPages,
  };
}
