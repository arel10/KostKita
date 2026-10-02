import prisma from '../../config/database';
import { logAudit } from '../../utils/audit';
import { getActiveSubscription, checkTenantLimit } from '../../utils/subscription';
import { AuditAction, EntityType } from '../../types/constants';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateTenantInput, UpdateTenantInput, CreateStayInput, EndStayInput } from './tenant.schema';

// ─────────────────────────────────────────────
// LIST TENANTS
// ─────────────────────────────────────────────

export async function listTenants(ownerId: string, query: { page?: number; perPage?: number; search?: string }) {
  const { page, perPage, skip } = getPaginationParams(query);

  const where = {
    ownerId,
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { whatsapp: { contains: query.search } },
      ],
    }),
  };

  const [total, tenants] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      include: {
        stays: {
          where: { status: 'active' },
          include: {
            room: { select: { id: true, roomNumber: true, name: true, property: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  return { data: tenants, meta: buildPaginationMeta(total, page, perPage) };
}

// ─────────────────────────────────────────────
// CREATE TENANT
// ─────────────────────────────────────────────

export async function createTenant(ownerId: string, input: CreateTenantInput, ip?: string, userAgent?: string) {
  const tenant = await prisma.tenant.create({
    data: { ownerId, name: input.name, whatsapp: input.whatsapp, notes: input.notes },
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.TENANT_CREATE, entityType: EntityType.TENANT, entityId: tenant.id, newValue: input, ipAddress: ip, userAgent });
  return tenant;
}

// ─────────────────────────────────────────────
// GET TENANT BY ID
// ─────────────────────────────────────────────

export async function getTenantById(ownerId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, ownerId },
    include: {
      stays: {
        include: {
          room: { include: { property: { select: { id: true, name: true } } } },
          payments: { orderBy: { periodStart: 'desc' }, take: 5 },
        },
        orderBy: { checkInDate: 'desc' },
      },
    },
  });

  if (!tenant) throw { code: 'NOT_FOUND', message: 'Penghuni tidak ditemukan.', status: 404 };
  return tenant;
}

// ─────────────────────────────────────────────
// UPDATE TENANT
// ─────────────────────────────────────────────

export async function updateTenant(ownerId: string, tenantId: string, input: UpdateTenantInput, ip?: string, userAgent?: string) {
  const existing = await prisma.tenant.findFirst({ where: { id: tenantId, ownerId } });
  if (!existing) throw { code: 'NOT_FOUND', message: 'Penghuni tidak ditemukan.', status: 404 };

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.TENANT_UPDATE, entityType: EntityType.TENANT, entityId: tenantId, oldValue: existing, newValue: input, ipAddress: ip, userAgent });
  return tenant;
}

// ─────────────────────────────────────────────
// TENANT STAYS
// ─────────────────────────────────────────────

export async function createStay(ownerId: string, tenantId: string, input: CreateStayInput, ip?: string, userAgent?: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, ownerId } });
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Penghuni tidak ditemukan.', status: 404 };

  const room = await prisma.room.findFirst({ where: { id: input.roomId, ownerId } });
  if (!room) throw { code: 'NOT_FOUND', message: 'Kamar tidak ditemukan.', status: 404 };

  if (room.status !== 'available') throw { code: 'ROOM_NOT_AVAILABLE', message: 'Kamar tidak tersedia.', status: 409 };

  // Check tenant limit
  const subscription = await getActiveSubscription(ownerId);
  if (!subscription) throw { code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription Anda telah berakhir.', status: 403 };

  const limitCheck = await checkTenantLimit(ownerId, subscription.planId);
  if (!limitCheck.allowed) {
    throw { code: 'TENANT_LIMIT_EXCEEDED', message: `Anda telah mencapai batas maksimum ${limitCheck.limit} penghuni aktif pada paket ini.`, status: 403 };
  }

  const stay = await prisma.$transaction(async (tx) => {
    const newStay = await tx.tenantStay.create({
      data: {
        tenantId,
        roomId: input.roomId,
        ownerId,
        checkInDate: new Date(input.checkInDate),
        rentPrice: input.rentPrice,
        deposit: input.deposit,
        status: 'active',
      },
    });
    await tx.room.update({ where: { id: input.roomId }, data: { status: 'occupied' } });
    return newStay;
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.STAY_CREATE, entityType: EntityType.TENANT_STAY, entityId: stay.id, newValue: input, ipAddress: ip, userAgent });
  return stay;
}

export async function endStay(ownerId: string, tenantId: string, stayId: string, input: EndStayInput, ip?: string, userAgent?: string) {
  const stay = await prisma.tenantStay.findFirst({
    where: { id: stayId, tenantId, ownerId, status: 'active' },
  });

  if (!stay) throw { code: 'NOT_FOUND', message: 'Data tinggal aktif tidak ditemukan.', status: 404 };

  await prisma.$transaction(async (tx) => {
    await tx.tenantStay.update({
      where: { id: stayId },
      data: { checkOutDate: new Date(input.checkOutDate), status: 'ended' },
    });
    await tx.room.update({ where: { id: stay.roomId }, data: { status: 'available' } });
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.STAY_END, entityType: EntityType.TENANT_STAY, entityId: stayId, ipAddress: ip, userAgent });
}
