import prisma from '../../config/database';
import { cloudinary } from '../../config/storage';
import { logAudit } from '../../utils/audit';
import { createNotification } from '../../utils/notification';
import { AuditAction, EntityType } from '../../types/constants';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { SubmitPaymentInput, RejectPaymentInput } from './subscription.schema';

// Generate reference number: INV-YYYYMMDD-XXXX
function generateReferenceNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${date}-${random}`;
}

// ─────────────────────────────────────────────
// OWNER: GET CURRENT SUBSCRIPTION
// ─────────────────────────────────────────────

import { checkPropertyLimit, checkRoomLimit, checkTenantLimit } from '../../utils/subscription';

export async function getCurrentSubscription(ownerId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { ownerId, status: { in: ['trial', 'active', 'expiring_soon'] } },
    include: { plan: { include: { features: true } } },
    orderBy: { endsAt: 'desc' },
  });

  if (!subscription) {
    const [propertyCount, roomCount, tenantCount] = await Promise.all([
      prisma.property.count({ where: { ownerId, status: { not: 'inactive' } } }),
      prisma.room.count({ where: { ownerId } }),
      prisma.tenantStay.count({ where: { ownerId, status: 'active' } }),
    ]);

    return {
      status: 'expired',
      plan: null,
      usage: {
        properties: { allowed: false, current: propertyCount, limit: 0 },
        rooms: { allowed: false, current: roomCount, limit: 0 },
        tenants: { allowed: false, current: tenantCount, limit: 0 },
      },
    };
  }

  const [propLimit, roomLimit, tenantLimit] = await Promise.all([
    checkPropertyLimit(ownerId, subscription.planId),
    checkRoomLimit(ownerId, subscription.planId),
    checkTenantLimit(ownerId, subscription.planId),
  ]);

  return {
    ...subscription,
    usage: {
      properties: propLimit,
      rooms: roomLimit,
      tenants: tenantLimit,
    },
  };
}

// ─────────────────────────────────────────────
// OWNER: GET SUBSCRIPTION HISTORY
// ─────────────────────────────────────────────

export async function getSubscriptionHistory(ownerId: string, query: any) {
  const { page, perPage, skip } = getPaginationParams(query);

  const [total, subscriptions] = await Promise.all([
    prisma.subscription.count({ where: { ownerId } }),
    prisma.subscription.findMany({
      where: { ownerId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  return { data: subscriptions, meta: buildPaginationMeta(total, page, perPage) };
}

// ─────────────────────────────────────────────
// OWNER: GET AVAILABLE PLANS
// ─────────────────────────────────────────────

export async function getAvailablePlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    include: { features: true },
    orderBy: { sortOrder: 'asc' },
  });
}

// ─────────────────────────────────────────────
// OWNER: SUBMIT PAYMENT PROOF
// ─────────────────────────────────────────────

export async function submitPaymentProof(
  ownerId: string,
  input: SubmitPaymentInput,
  file?: Express.Multer.File,
  ip?: string,
  userAgent?: string
) {
  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: input.planId, isActive: true } });
  if (!plan) throw { code: 'NOT_FOUND', message: 'Paket tidak ditemukan.', status: 404 };

  let proofUrl: string | undefined;

  if (file) {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `kostkita/payment-proofs/${ownerId}`, resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string });
        }
      ).end(file.buffer);
    });
    proofUrl = result.secure_url;
  }

  const payment = await prisma.subscriptionPayment.create({
    data: {
      ownerId,
      planId: input.planId,
      referenceNo: generateReferenceNo(),
      amount: input.amount,
      paymentDate: new Date(input.paymentDate),
      paymentMethod: input.paymentMethod,
      proofUrl,
      notes: input.notes,
      status: 'pending',
    },
  });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.SUBSCRIPTION_PAYMENT_SUBMIT,
    entityType: EntityType.SUBSCRIPTION_PAYMENT,
    entityId: payment.id,
    newValue: { referenceNo: payment.referenceNo, planId: input.planId, amount: input.amount },
    ipAddress: ip,
    userAgent,
  });

  return payment;
}

// ─────────────────────────────────────────────
// OWNER: GET PAYMENT HISTORY
// ─────────────────────────────────────────────

export async function getOwnerPaymentHistory(ownerId: string, query: any) {
  const { page, perPage, skip } = getPaginationParams(query);

  const [total, payments] = await Promise.all([
    prisma.subscriptionPayment.count({ where: { ownerId } }),
    prisma.subscriptionPayment.findMany({
      where: { ownerId },
      include: { plan: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  return { data: payments, meta: buildPaginationMeta(total, page, perPage) };
}

// ─────────────────────────────────────────────
// ADMIN: LIST ALL PAYMENTS
// ─────────────────────────────────────────────

export async function adminListPayments(query: any) {
  const { page, perPage, skip } = getPaginationParams(query);

  const where = {
    ...(query.status && { status: query.status }),
  };

  const [total, payments] = await Promise.all([
    prisma.subscriptionPayment.count({ where }),
    prisma.subscriptionPayment.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  return { data: payments, meta: buildPaginationMeta(total, page, perPage) };
}

// ─────────────────────────────────────────────
// ADMIN: APPROVE PAYMENT
// ─────────────────────────────────────────────

export async function approvePayment(
  adminId: string,
  paymentId: string,
  ip?: string,
  userAgent?: string
) {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { plan: true },
  });

  if (!payment) throw { code: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan.', status: 404 };
  if (payment.status !== 'pending') throw { code: 'INVALID_STATUS', message: 'Pembayaran ini sudah diproses.', status: 409 };

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + payment.plan.durationDays);

  await prisma.$transaction(async (tx) => {
    // Update payment
    await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: { status: 'approved', reviewedBy: adminId, reviewedAt: now },
    });

    // Deactivate old subscriptions
    await tx.subscription.updateMany({
      where: { ownerId: payment.ownerId, status: { in: ['trial', 'active', 'expiring_soon'] } },
      data: { status: 'cancelled' },
    });

    // Create new active subscription
    const subscription = await tx.subscription.create({
      data: {
        ownerId: payment.ownerId,
        planId: payment.planId,
        status: 'active',
        startsAt: now,
        endsAt,
        activatedByPaymentId: paymentId,
      },
    });

    // Link payment to subscription
    await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: { activatedSubscription: { connect: { id: subscription.id } } },
    });

    // Reactivate owner's properties if they were inactive due to expired subscription
    await tx.property.updateMany({
      where: { ownerId: payment.ownerId, status: 'inactive' },
      data: { status: 'active' },
    });
  });

  // Notify owner
  await createNotification({
    userId: payment.ownerId,
    type: 'payment_approved',
    title: 'Pembayaran Disetujui ✅',
    message: `Pembayaran Anda untuk paket ${payment.plan.name} telah disetujui. Subscription aktif hingga ${endsAt.toLocaleDateString('id-ID')}.`,
    data: { paymentId, planName: payment.plan.name },
  });

  await logAudit({
    actorId: adminId,
    actorRole: 'super_admin',
    action: AuditAction.SUBSCRIPTION_PAYMENT_APPROVE,
    entityType: EntityType.SUBSCRIPTION_PAYMENT,
    entityId: paymentId,
    newValue: { status: 'approved', ownerId: payment.ownerId },
    ipAddress: ip,
    userAgent,
  });
}

// ─────────────────────────────────────────────
// ADMIN: REJECT PAYMENT
// ─────────────────────────────────────────────

export async function rejectPayment(
  adminId: string,
  paymentId: string,
  input: RejectPaymentInput,
  ip?: string,
  userAgent?: string
) {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { plan: true },
  });

  if (!payment) throw { code: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan.', status: 404 };
  if (payment.status !== 'pending') throw { code: 'INVALID_STATUS', message: 'Pembayaran ini sudah diproses.', status: 409 };

  await prisma.subscriptionPayment.update({
    where: { id: paymentId },
    data: {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectionReason: input.reason,
    },
  });

  await createNotification({
    userId: payment.ownerId,
    type: 'payment_rejected',
    title: 'Pembayaran Ditolak ❌',
    message: `Pembayaran Anda untuk paket ${payment.plan.name} ditolak. Alasan: ${input.reason}`,
    data: { paymentId, reason: input.reason },
  });

  await logAudit({
    actorId: adminId,
    actorRole: 'super_admin',
    action: AuditAction.SUBSCRIPTION_PAYMENT_REJECT,
    entityType: EntityType.SUBSCRIPTION_PAYMENT,
    entityId: paymentId,
    newValue: { status: 'rejected', reason: input.reason },
    ipAddress: ip,
    userAgent,
  });
}
