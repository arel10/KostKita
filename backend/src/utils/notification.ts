import prisma from '../config/database';
import { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: (params.data ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<void> {
  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: (n.data ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    })),
  });
}
