import { prisma } from './db';
import { sendPriceAlertEmail } from './email';

interface NotificationResult {
  alertId: string;
  success: boolean;
  error?: string;
}

export async function checkAndNotifyPriceDrops(): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  try {
    // Find all active alerts where current price is at or below target
    const triggeredAlerts = await prisma.alert.findMany({
      where: {
        isActive: true,
        notifiedAt: null,
        product: {
          currentPrice: {
            lte: prisma.alert.fields.targetPrice,
          },
        },
      },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Process each triggered alert
    for (const alert of triggeredAlerts) {
      if (!alert.user.email) {
        results.push({
          alertId: alert.id,
          success: false,
          error: 'User has no email address',
        });
        continue;
      }

      try {
        const emailSent = await sendPriceAlertEmail(alert.user.email, {
          userName: alert.user.name || 'there',
          productName: alert.product.name,
          productUrl: alert.product.url,
          originalPrice: alert.product.originalPrice || alert.product.currentPrice,
          currentPrice: alert.product.currentPrice,
          targetPrice: alert.targetPrice,
        });

        if (emailSent) {
          // Mark alert as notified
          await prisma.alert.update({
            where: { id: alert.id },
            data: { notifiedAt: new Date() },
          });

          results.push({
            alertId: alert.id,
            success: true,
          });
        } else {
          results.push({
            alertId: alert.id,
            success: false,
            error: 'Failed to send email',
          });
        }
      } catch (error) {
        results.push({
          alertId: alert.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error checking price drops:', error);
    throw error;
  }
}

export async function resetAlertNotification(alertId: string): Promise<void> {
  await prisma.alert.update({
    where: { id: alertId },
    data: { notifiedAt: null },
  });
}

export async function getAlertStats(userId: string) {
  const [total, active, triggered] = await Promise.all([
    prisma.alert.count({ where: { userId } }),
    prisma.alert.count({ where: { userId, isActive: true } }),
    prisma.alert.count({ where: { userId, notifiedAt: { not: null } } }),
  ]);

  return { total, active, triggered };
}
