import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import prisma from './config/database';
import { scheduleSubscriptionExpiryJob, schedulePaymentOverdueJob } from './jobs/subscription-expiry.job';

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    const app = createApp();

    // Start background jobs
    scheduleSubscriptionExpiryJob();
    schedulePaymentOverdueJob();

    // Sync active suspended users to Redis blacklist
    try {
      const { blacklistUser } = await import('./config/redis');
      const suspendedUsers = await prisma.user.findMany({
        where: { status: 'suspended' },
        select: { id: true },
      });
      for (const u of suspendedUsers) {
        await blacklistUser(u.id);
      }
      if (suspendedUsers.length > 0) {
        logger.info(`🔒 Synced ${suspendedUsers.length} suspended user(s) to Redis blacklist`);
      }
    } catch {
      // Non-fatal if Redis is loading
    }

    app.listen(env.PORT, () => {
      logger.info(`🚀 ${env.APP_NAME} backend running on port ${env.PORT}`);
      logger.info(`   Environment: ${env.NODE_ENV}`);
      logger.info(`   API prefix: /api/v1`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
