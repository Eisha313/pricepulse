import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const alerts = await db.alert.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, targetPrice } = body;

    if (!productId || !targetPrice) {
      return NextResponse.json(
        { error: 'Product ID and target price are required' },
        { status: 400 }
      );
    }

    // Check if user has premium or alert limit
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscription: true,
        alerts: true,
      },
    });

    const isPremium = user?.subscription?.status === 'active';
    const alertCount = user?.alerts?.length || 0;
    const FREE_ALERT_LIMIT = 3;

    if (!isPremium && alertCount >= FREE_ALERT_LIMIT) {
      return NextResponse.json(
        { error: 'Alert limit reached. Upgrade to premium for unlimited alerts.' },
        { status: 403 }
      );
    }

    // Check if alert already exists for this product
    const existingAlert = await db.alert.findFirst({
      where: {
        userId: session.user.id,
        productId,
      },
    });

    if (existingAlert) {
      // Update existing alert
      const updatedAlert = await db.alert.update({
        where: { id: existingAlert.id },
        data: { targetPrice: parseFloat(targetPrice) },
        include: { product: true },
      });
      return NextResponse.json(updatedAlert);
    }

    const alert = await db.alert.create({
      data: {
        userId: session.user.id,
        productId,
        targetPrice: parseFloat(targetPrice),
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}