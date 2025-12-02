import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUsageStats } from '@/lib/subscription';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const stats = await getUsageStats(session.user.id);

    return apiSuccess(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
