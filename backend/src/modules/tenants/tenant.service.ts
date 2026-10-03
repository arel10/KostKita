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
          include: {
            room: {
              select: {
                id: true,
                roomNumber: true,
                name: true,
                type: true,
                price: true,
                propertyId: true,
                property: { select: { id: true, name: true, city: true } },
              },
            },
          },
          orderBy: { checkInDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  const mappedTenants = tenants.map((t) => ({
    ...t,
    phone: t.whatsapp || '',
    whatsapp: t.whatsapp || '',
    stays: t.stays.map((s) => ({
      ...s,
      startDate: s.checkInDate.toISOString(),
      endDate: s.checkOutDate ? s.checkOutDate.toISOString() : null,
      rentAmount: Number(s.rentPrice),
      deposit: Number(s.deposit),
      room: s.room ? {
        ...s.room,
        propertyId: s.room.propertyId,
        property: s.room.property || { id: '', name: 'Properti', city: '' },
      } : null,
    })),
  }));

  return { data: mappedTenants, meta: buildPaginationMeta(total, page, perPage) };
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CREATE TENANT
// ─────────────────────────────────────────────

export async function createTenant(ownerId: string, input: CreateTenantInput, ip?: string, userAgent?: string) {
  let cleanPhone = (input.whatsapp || input.phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  const tenant = await prisma.tenant.create({
    data: {
      ownerId,
      name: input.name,
      whatsapp: cleanPhone || null,
      notes: input.notes,
    },
  });

  const roomId = input.roomId;
  const checkInDateStr = input.startDate || input.checkInDate;
  const rentPrice = input.rentAmount !== undefined ? input.rentAmount : input.rentPrice;

  if (roomId) {
    const subscription = await getActiveSubscription(ownerId);
    if (!subscription) {
      throw { code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription Anda telah berakhir. Silakan perpanjang untuk menambah penyewa.', status: 403 };
    }
    const limitCheck = await checkTenantLimit(ownerId, subscription.planId);
    if (!limitCheck.allowed) {
      throw {
        code: 'TENANT_LIMIT_EXCEEDED',
        message: `Anda telah mencapai batas maksimum ${limitCheck.limit} penyewa aktif pada paket ini. Upgrade paket untuk menambah lebih banyak penyewa.`,
        status: 403,
      };
    }

    const checkInDate = checkInDateStr ? new Date(checkInDateStr) : new Date();
    const finalRentPrice = rentPrice !== undefined ? Number(rentPrice) : 0;
    const deposit = input.deposit ? Number(input.deposit) : 0;

    await prisma.$transaction(async (tx) => {
      await tx.tenantStay.create({
        data: {
          tenantId: tenant.id,
          roomId,
          ownerId,
          checkInDate,
          rentPrice: finalRentPrice,
          deposit,
          status: 'active',
        },
      });

      // Automatically update room status to 'occupied'
      await tx.room.update({
        where: { id: roomId },
        data: { status: 'occupied' },
      });
    });
  }

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.TENANT_CREATE,
    entityType: EntityType.TENANT,
    entityId: tenant.id,
    newValue: input,
    ipAddress: ip,
    userAgent,
  });

  return getTenantById(ownerId, tenant.id);
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
          room: {
            include: {
              property: { select: { id: true, name: true, city: true } },
            },
          },
          payments: { orderBy: { periodStart: 'desc' }, take: 5 },
        },
        orderBy: { checkInDate: 'desc' },
      },
    },
  });

  if (!tenant) throw { code: 'NOT_FOUND', message: 'Penghuni tidak ditemukan.', status: 404 };

  return {
    ...tenant,
    phone: tenant.whatsapp || '',
    whatsapp: tenant.whatsapp || '',
    stays: tenant.stays.map((s) => ({
      ...s,
      startDate: s.checkInDate ? (s.checkInDate instanceof Date ? s.checkInDate.toISOString() : new Date(s.checkInDate).toISOString()) : null,
      endDate: s.checkOutDate ? (s.checkOutDate instanceof Date ? s.checkOutDate.toISOString() : new Date(s.checkOutDate).toISOString()) : null,
      rentAmount: Number(s.rentPrice),
      deposit: Number(s.deposit),
      room: s.room
        ? {
            ...s.room,
            propertyId: s.room.propertyId,
            property: s.room.property || { id: '', name: 'Properti', city: '' },
          }
        : null,
    })),
  };
}

// ─────────────────────────────────────────────
// UPDATE TENANT
// ─────────────────────────────────────────────

export async function updateTenant(ownerId: string, tenantId: string, input: UpdateTenantInput, ip?: string, userAgent?: string) {
  const existing = await prisma.tenant.findFirst({
    where: { id: tenantId, ownerId },
    include: { stays: { where: { status: 'active' } } },
  });
  if (!existing) throw { code: 'NOT_FOUND', message: 'Penghuni tidak ditemukan.', status: 404 };

  let cleanPhone = input.whatsapp || input.phone;
  if (cleanPhone !== undefined) {
    cleanPhone = cleanPhone ? cleanPhone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(input.name && { name: input.name }),
      ...(cleanPhone !== undefined && { whatsapp: cleanPhone || null }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });

  const activeStay = existing.stays?.[0];
  const targetRoomId = input.roomId;
  const checkInDateStr = input.startDate || input.checkInDate;
  const rentPrice = input.rentAmount !== undefined ? input.rentAmount : input.rentPrice;

  if (targetRoomId) {
    if (activeStay) {
      if (activeStay.roomId !== targetRoomId) {
        // Room changed: Free previous room if no other active stays
        const oldRoomActive = await prisma.tenantStay.count({
          where: { roomId: activeStay.roomId, status: 'active', id: { not: activeStay.id } },
        });
        if (oldRoomActive === 0) {
          await prisma.room.update({
            where: { id: activeStay.roomId },
            data: { status: 'available' },
          });
        }
        // Mark new room occupied
        await prisma.room.update({
          where: { id: targetRoomId },
          data: { status: 'occupied' },
        });
      } else {
        // Same room, ensure occupied
        await prisma.room.update({
          where: { id: targetRoomId },
          data: { status: 'occupied' },
        });
      }

      // Update active stay
      await prisma.tenantStay.update({
        where: { id: activeStay.id },
        data: {
          roomId: targetRoomId,
          ...(checkInDateStr && { checkInDate: new Date(checkInDateStr) }),
          ...(rentPrice !== undefined && { rentPrice: Number(rentPrice) }),
          ...(input.deposit !== undefined && { deposit: Number(input.deposit) }),
        },
      });
    } else {
      // Create new stay and set room to occupied
      await prisma.$transaction(async (tx) => {
        await tx.tenantStay.create({
          data: {
            tenantId,
            roomId: targetRoomId,
            ownerId,
            checkInDate: checkInDateStr ? new Date(checkInDateStr) : new Date(),
            rentPrice: rentPrice !== undefined ? Number(rentPrice) : 0,
            deposit: input.deposit ? Number(input.deposit) : 0,
            status: 'active',
          },
        });
        await tx.room.update({
          where: { id: targetRoomId },
          data: { status: 'occupied' },
        });
      });
    }
  } else if (activeStay) {
    // Just update stay dates or price
    await prisma.tenantStay.update({
      where: { id: activeStay.id },
      data: {
        ...(checkInDateStr && { checkInDate: new Date(checkInDateStr) }),
        ...(rentPrice !== undefined && { rentPrice: Number(rentPrice) }),
        ...(input.deposit !== undefined && { deposit: Number(input.deposit) }),
      },
    });
    // Ensure room stays occupied
    await prisma.room.update({
      where: { id: activeStay.roomId },
      data: { status: 'occupied' },
    });
  }

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.TENANT_UPDATE,
    entityType: EntityType.TENANT,
    entityId: tenantId,
    oldValue: existing,
    newValue: input,
    ipAddress: ip,
    userAgent,
  });

  return getTenantById(ownerId, tenantId);
}

// ─────────────────────────────────────────────
// DELETE TENANT
// ─────────────────────────────────────────────

export async function deleteTenant(ownerId: string, tenantId: string, ip?: string, userAgent?: string) {
  const existing = await prisma.tenant.findFirst({
    where: { id: tenantId, ownerId },
    include: { stays: { where: { status: 'active' } } },
  });
  if (!existing) throw { code: 'NOT_FOUND', message: 'Penghuni tidak ditemukan.', status: 404 };

  // Free any active rooms
  for (const stay of existing.stays) {
    const otherActive = await prisma.tenantStay.count({
      where: { roomId: stay.roomId, status: 'active', id: { not: stay.id } },
    });
    if (otherActive === 0) {
      await prisma.room.update({
        where: { id: stay.roomId },
        data: { status: 'available' },
      });
    }
  }

  // Delete stay records then tenant
  await prisma.$transaction(async (tx) => {
    await tx.tenantPayment.deleteMany({
      where: { tenantStay: { tenantId } },
    });
    await tx.tenantStay.deleteMany({
      where: { tenantId },
    });
    await tx.tenant.delete({
      where: { id: tenantId },
    });
  });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.TENANT_DELETE,
    entityType: EntityType.TENANT,
    entityId: tenantId,
    oldValue: existing,
    ipAddress: ip,
    userAgent,
  });
}

// ─────────────────────────────────────────────
// TENANT STAYS
// ─────────────────────────────────────────────

export async function createStay(ownerId: string, tenantId: string, input: CreateStayInput, ip?: string, userAgent?: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, ownerId } });
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Penghuni tidak ditemukan.', status: 404 };

  const subscription = await getActiveSubscription(ownerId);
  if (!subscription) throw { code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription Anda telah berakhir.', status: 403 };

  const limitCheck = await checkTenantLimit(ownerId, subscription.planId);
  if (!limitCheck.allowed) {
    throw {
      code: 'TENANT_LIMIT_EXCEEDED',
      message: `Anda telah mencapai batas maksimum ${limitCheck.limit} penyewa aktif pada paket ini. Upgrade paket untuk menambah lebih banyak penyewa.`,
      status: 403,
    };
  }

  const room = await prisma.room.findFirst({ where: { id: input.roomId, ownerId } });
  if (!room) throw { code: 'NOT_FOUND', message: 'Kamar tidak ditemukan.', status: 404 };

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

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.STAY_CREATE,
    entityType: EntityType.TENANT_STAY,
    entityId: stay.id,
    newValue: input,
    ipAddress: ip,
    userAgent,
  });

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
    const otherActive = await tx.tenantStay.count({
      where: { roomId: stay.roomId, status: 'active', id: { not: stayId } },
    });
    if (otherActive === 0) {
      await tx.room.update({ where: { id: stay.roomId }, data: { status: 'available' } });
    }
  });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.STAY_END,
    entityType: EntityType.TENANT_STAY,
    entityId: stayId,
    ipAddress: ip,
    userAgent,
  });
}
