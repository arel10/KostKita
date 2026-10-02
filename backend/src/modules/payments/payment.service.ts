import prisma from '../../config/database';
import { logAudit } from '../../utils/audit';
import { AuditAction, EntityType } from '../../types/constants';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreatePaymentInput, UpdatePaymentInput } from './payment.schema';

export async function listPayments(ownerId: string, query: any) {
  const { page, perPage, skip } = getPaginationParams(query);

  const where = {
    ownerId,
    ...(query.status && { status: query.status }),
    ...(query.tenantStayId && { tenantStayId: query.tenantStayId }),
    ...(query.propertyId && { tenantStay: { room: { propertyId: query.propertyId } } }),
  };

  const [total, payments] = await Promise.all([
    prisma.tenantPayment.count({ where }),
    prisma.tenantPayment.findMany({
      where,
      include: {
        tenantStay: {
          include: {
            tenant: { select: { id: true, name: true } },
            room: { select: { id: true, roomNumber: true, name: true, property: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { periodStart: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  return { data: payments, meta: buildPaginationMeta(total, page, perPage) };
}

export async function createPayment(ownerId: string, input: CreatePaymentInput, ip?: string, userAgent?: string) {
  const stay = await prisma.tenantStay.findFirst({ where: { id: input.tenantStayId, ownerId } });
  if (!stay) throw { code: 'NOT_FOUND', message: 'Data tinggal tidak ditemukan.', status: 404 };

  const payment = await prisma.tenantPayment.create({
    data: {
      ownerId,
      tenantStayId: input.tenantStayId,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      amount: input.amount,
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : null,
      paymentMethod: input.paymentMethod ?? null,
      status: input.status,
      notes: input.notes,
    },
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.PAYMENT_CREATE, entityType: EntityType.PAYMENT, entityId: payment.id, newValue: input, ipAddress: ip, userAgent });
  return payment;
}

export async function getPaymentById(ownerId: string, paymentId: string) {
  const payment = await prisma.tenantPayment.findFirst({
    where: { id: paymentId, ownerId },
    include: {
      tenantStay: {
        include: {
          tenant: true,
          room: { include: { property: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!payment) throw { code: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan.', status: 404 };
  return payment;
}

export async function updatePayment(ownerId: string, paymentId: string, input: UpdatePaymentInput, ip?: string, userAgent?: string) {
  const existing = await prisma.tenantPayment.findFirst({ where: { id: paymentId, ownerId } });
  if (!existing) throw { code: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan.', status: 404 };

  const payment = await prisma.tenantPayment.update({
    where: { id: paymentId },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.paymentDate !== undefined && { paymentDate: input.paymentDate ? new Date(input.paymentDate) : null }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod ?? null }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.PAYMENT_UPDATE, entityType: EntityType.PAYMENT, entityId: paymentId, oldValue: existing, newValue: input, ipAddress: ip, userAgent });
  return payment;
}

export async function deletePayment(ownerId: string, paymentId: string) {
  const payment = await prisma.tenantPayment.findFirst({ where: { id: paymentId, ownerId } });
  if (!payment) throw { code: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan.', status: 404 };

  await prisma.tenantPayment.delete({ where: { id: paymentId } });
}
