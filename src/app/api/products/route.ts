import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const FREE_PRODUCT_LIMIT = 3;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        products: {
          include: {
            priceHistory: {
              orderBy: { checkedAt: 'desc' },
              take: 30,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      products: user.products,
      isPremium: user.isPremium,
      productCount: user.products.length,
      productLimit: user.isPremium ? null : FREE_PRODUCT_LIMIT,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { products: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check product limit for free users
    if (!user.isPremium && user.products.length >= FREE_PRODUCT_LIMIT) {
      return NextResponse.json(
        { error: 'Product limit reached. Upgrade to Premium for unlimited tracking.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { url, name, targetPrice, currentPrice, imageUrl } = body;

    if (!url || !name || targetPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: url, name, targetPrice' },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        url,
        name,
        targetPrice: parseFloat(targetPrice),
        currentPrice: currentPrice ? parseFloat(currentPrice) : null,
        imageUrl,
        userId: user.id,
      },
    });

    // Create initial price history entry if current price is provided
    if (currentPrice) {
      await db.priceHistory.create({
        data: {
          productId: product.id,
          price: parseFloat(currentPrice),
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
