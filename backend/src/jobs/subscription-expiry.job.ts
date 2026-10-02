import cron from 'node-cron';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { createNotification } from '../utils/notification';
import { logAudit } from '../utils/audit';
import { AuditAction, EntityType } from '../types/constants';

/**
 * Subscription Expiry Job — runs daily at midnight
 *
 * Checks:
 * 1. H-3: Send expiring_soon notification, update status
 * 2. H-1: Send reminder notification
 * 3. Expired: Set status=expired, deactivate all properties
 */
export function scheduleSubscriptionExpiryJob(): void {
  cron.schedule('0 0 * * *', async () => {
    logger.info('[CronJob] Running subscription expiry check...');

    try {
      const now = new Date();

      // ── H-3 Reminder ─────────────────────────
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const expiringIn3Days = await prisma.subscription.findMany({
        where: {
          status: 'active',
          endsAt: { lte: threeDaysFromNow, gt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
        },
        include: { plan: true },
      });

      for (const sub of expiringIn3Days) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'expiring_soon' } });
        await createNotification({
          userId: sub.ownerId,
          type: 'subscription_expiring',
          title: '⚠️ Subscription Akan Segera Berakhir',
          message: `Subscription ${sub.plan.name} Anda akan berakhir dalam 3 hari (${sub.endsAt.toLocaleDateString('id-ID')}). Segera perpanjang untuk menjaga listing tetap aktif.`,
          data: { subscriptionId: sub.id, endsAt: sub.endsAt },
        });
      }

      // ── H-1 Reminder ─────────────────────────
      const oneDayFromNow = new Date(now);
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

      const expiringIn1Day = await prisma.subscription.findMany({
        where: {
          status: { in: ['active', 'expiring_soon'] },
          endsAt: { lte: oneDayFromNow, gt: now },
        },
        include: { plan: true },
      });

      for (const sub of expiringIn1Day) {
        await createNotification({
          userId: sub.ownerId,
          type: 'subscription_expiring',
          title: '🚨 Subscription Berakhir Besok!',
          message: `Subscription ${sub.plan.name} Anda akan berakhir besok (${sub.endsAt.toLocaleDateString('id-ID')}). Perpanjang sekarang sebelum listing menjadi tidak aktif.`,
          data: { subscriptionId: sub.id, endsAt: sub.endsAt },
        });
      }

      // ── Expired ───────────────────────────────
      const expired = await prisma.subscription.findMany({
        where: {
          status: { in: ['active', 'expiring_soon', 'trial'] },
          endsAt: { lte: now },
        },
        include: { plan: true },
      });

      for (const sub of expired) {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({ where: { id: sub.id }, data: { status: 'expired' } });
          await tx.property.updateMany({
            where: { ownerId: sub.ownerId, status: { in: ['active', 'draft'] } },
            data: { status: 'inactive' },
          });
        });

        await createNotification({
          userId: sub.ownerId,
          type: 'subscription_expired',
          title: '❌ Subscription Telah Berakhir',
          message: `Subscription ${sub.plan.name} Anda telah berakhir. Semua listing Anda telah dinonaktifkan. Perpanjang untuk mengaktifkan kembali.`,
          data: { subscriptionId: sub.id },
        });

        await logAudit({
          action: AuditAction.SUBSCRIPTION_EXPIRE,
          entityType: EntityType.SUBSCRIPTION,
          entityId: sub.id,
          newValue: { status: 'expired', ownerId: sub.ownerId },
        });

        logger.info(`[CronJob] Subscription expired for owner ${sub.ownerId}`);
      }

      logger.info(`[CronJob] Subscription expiry check complete. Expired: ${expired.length}, H-3: ${expiringIn3Days.length}, H-1: ${expiringIn1Day.length}`);
    } catch (error) {
      logger.error('[CronJob] Subscription expiry job failed', { error });
    }
  });

  logger.info('[CronJob] Subscription expiry job scheduled (daily at 00:00)');
}

/**
 * Payment Overdue Job — runs daily at 01:00 AM
 * Marks pending payments with period_end < today as overdue
 */
export function schedulePaymentOverdueJob(): void {
  cron.schedule('0 1 * * *', async () => {
    logger.info('[CronJob] Running payment overdue check...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await prisma.tenantPayment.updateMany({
        where: { status: 'pending', periodEnd: { lt: today } },
        data: { status: 'overdue' },
      });

      logger.info(`[CronJob] Marked ${result.count} payments as overdue`);
    } catch (error) {
      logger.error('[CronJob] Payment overdue job failed', { error });
    }
  });

  logger.info('[CronJob] Payment overdue job scheduled (daily at 01:00)');
}
