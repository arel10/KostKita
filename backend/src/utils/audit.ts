import prisma from '../config/database';
import { logger } from '../config/logger';
import { AuditActionType } from '../types/constants';

interface LogAuditParams {
  actorId?: string | null;
  actorRole?: string | null;
  action: AuditActionType | string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        oldValue: params.oldValue ? (params.oldValue as object) : undefined,
        newValue: params.newValue ? (params.newValue as object) : undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    // Don't let audit log failure break the main flow
    logger.error('Failed to write audit log', { error, params });
  }
}
