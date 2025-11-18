import { NextResponse } from 'next/server';

export type ApiError = {
  error: string;
  code?: string;
  details?: unknown;
};

export type ApiSuccess<T> = {
  data: T;
  message?: string;
};

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      data,
      ...(message && { message }),
    },
    { status }
  );
}

export function errorResponse(
  error: string,
  status: number = 400,
  code?: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      ...(code && { code }),
      ...(details && { details }),
    },
    { status }
  );
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse<ApiError> {
  return errorResponse(`${resource} not found`, 404, 'NOT_FOUND');
}

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ApiError> {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse<ApiError> {
  return errorResponse(message, 403, 'FORBIDDEN');
}

export function badRequestResponse(
  message: string = 'Bad request',
  details?: unknown
): NextResponse<ApiError> {
  return errorResponse(message, 400, 'BAD_REQUEST', details);
}

export function serverErrorResponse(
  message: string = 'Internal server error'
): NextResponse<ApiError> {
  return errorResponse(message, 500, 'INTERNAL_ERROR');
}

export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiError> {
  return errorResponse('Validation failed', 422, 'VALIDATION_ERROR', errors);
}

export function rateLimitResponse(
  retryAfter?: number
): NextResponse<ApiError> {
  const response = errorResponse(
    'Too many requests',
    429,
    'RATE_LIMIT_EXCEEDED'
  );
  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }
  return response;
}
