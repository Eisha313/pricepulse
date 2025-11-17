import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const productId = params.id;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Verify the product belongs to the user
    const product = await db.product.findFirst({
      where: {
        id: productId,
        userId: session.user.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch price history, ordered by date ascending
    const priceHistory = await db.priceHistory.findMany({
      where: {
        productId: productId,
      },
      orderBy: {
        checkedAt: 'asc',
      },
      select: {
        id: true,
        price: true,
        checkedAt: true,
      },
    });

    // Filter out any invalid entries
    const validHistory = priceHistory.filter(
      (entry) => 
        entry.price !== null && 
        entry.price !== undefined && 
        !isNaN(entry.price) &&
        entry.price > 0
    );

    return NextResponse.json(validHistory);
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}
