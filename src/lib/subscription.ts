import { db } from './db';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionLimits {
  maxProducts: number;
  maxAlerts: number;
  priceHistoryDays: number;
  updateFrequencyMinutes: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxProducts: 3,
    maxAlerts: 5,
    priceHistoryDays: 7,
    updateFrequencyMinutes: 360, // 6 hours
  },
  premium: {
    maxProducts: 100,
    maxAlerts: 500,
    priceHistoryDays: 365,
    updateFrequencyMinutes: 60, // 1 hour
  },
};

export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
    },
  });

  if (
    user?.stripeSubscriptionId &&
    user?.stripeSubscriptionStatus === 'active'
  ) {
    return 'premium';
  }

  return 'free';
}

export async function getUserLimits(userId: string): Promise<SubscriptionLimits> {
  const tier = await getUserSubscription(userId);
  return SUBSCRIPTION_LIMITS[tier];
}

export async function getCurrentUserSubscription(): Promise<{
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
} | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const tier = await getUserSubscription(session.user.id);
  return {
    tier,
    limits: SUBSCRIPTION_LIMITS[tier],
  };
}

export async function checkProductLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
}> {
  const limits = await getUserLimits(userId);
  
  const productCount = await db.product.count({
    where: { userId },
  });

  return {
    allowed: productCount < limits.maxProducts,
    current: productCount,
    max: limits.maxProducts,
  };
}

export async function checkAlertLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
}> {
  const limits = await getUserLimits(userId);
  
  const alertCount = await db.alert.count({
    where: {
      product: { userId },
      active: true,
    },
  });

  return {
    allowed: alertCount < limits.maxAlerts,
    current: alertCount,
    max: limits.maxAlerts,
  };
}

export async function getUsageStats(userId: string): Promise<{
  tier: SubscriptionTier;
  products: { current: number; max: number };
  alerts: { current: number; max: number };
  priceHistoryDays: number;
  updateFrequency: string;
}> {
  const tier = await getUserSubscription(userId);
  const limits = SUBSCRIPTION_LIMITS[tier];

  const [productCount, alertCount] = await Promise.all([
    db.product.count({ where: { userId } }),
    db.alert.count({
      where: {
        product: { userId },
        active: true,
      },
    }),
  ]);

  const formatFrequency = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `Every ${minutes} minutes`;
  };

  return {
    tier,
    products: {
      current: productCount,
      max: limits.maxProducts,
    },
    alerts: {
      current: alertCount,
      max: limits.maxAlerts,
    },
    priceHistoryDays: limits.priceHistoryDays,
    updateFrequency: formatFrequency(limits.updateFrequencyMinutes),
  };
}
