import prisma from '../../config/database';
import { logAudit } from '../../utils/audit';
import { getActiveSubscription, checkTenantLimit } from '../../utils/subscription';
import { AuditAction, EntityType } from '../../types/constants';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateTenantInput, UpdateTenantInput, CreateStayInput, EndStayInput } from './tenant.schema';

// ─────────────────────────────────────────────
// LIST TENANTS
// ─────────────────────────────────────────────

function addMonthsSafely(date: Date, months: number, originalDay: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  const maxDays = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, maxDays));
  return result;
}

interface TenantMetadata {
  idCardNumber?: string;
  emergencyPhone?: string;
  realNotes?: string;
}

function packTenantNotes(notes?: string | null, idCardNumber?: string | null, emergencyPhone?: string | null): string | null {
  const hasMeta = (idCardNumber !== undefined && idCardNumber !== null && idCardNumber.trim() !== '') ||
                  (emergencyPhone !== undefined && emergencyPhone !== null && emergencyPhone.trim() !== '');
  if (!hasMeta) {
    return notes || null;
  }
  const payload: TenantMetadata = {
    idCardNumber: idCardNumber?.trim() || undefined,
    emergencyPhone: emergencyPhone?.trim() || undefined,
    realNotes: notes || undefined,
  };
  return JSON.stringify(payload);
}

function unpackTenantNotes(rawNotes?: string | null): { notes: string; idCardNumber: string; emergencyPhone: string } {
  if (!rawNotes) {
    return { notes: '', idCardNumber: '', emergencyPhone: '' };
  }
  if (rawNotes.startsWith('{') && rawNotes.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawNotes);
      if (parsed && typeof parsed === 'object') {
        return {
          notes: parsed.realNotes || '',
          idCardNumber: parsed.idCardNumber || '',
          emergencyPhone: parsed.emergencyPhone || '',
        };
      }
    } catch {
      // not JSON, fallback
    }
  }
  return { notes: rawNotes, idCardNumber: '', emergencyPhone: '' };
}

export function calculateDueInfo(
  checkInDate: Date | string,
  payments: Array<{ status: string; periodEnd: Date | string; periodStart: Date | string; amount?: any }> = []
) {
  const cin = new Date(checkInDate);
  const originalDay = cin.getDate();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find latest paid periodEnd
  const paidPayments = payments
    .filter((p) => p.status === 'paid')
    .map((p) => new Date(p.periodEnd))
    .sort((a, b) => b.getTime() - a.getTime());

  const latestPaidEnd = paidPayments[0] || null;

  // Next renewal target date: starts from 1 month after checkInDate
  let targetDueDate = addMonthsSafely(cin, 1, originalDay);

  // If latest paid period covers this target date, advance to next month
  while (latestPaidEnd && latestPaidEnd >= targetDueDate) {
    targetDueDate = addMonthsSafely(targetDueDate, 1, originalDay);
  }

  // Calculate diff in days
  const targetDateOnly = new Date(targetDueDate.getFullYear(), targetDueDate.getMonth(), targetDueDate.getDate());
  const diffTime = targetDateOnly.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let dueStatus: 'paid' | 'due_today' | 'due_soon' | 'overdue' | 'upcoming';
  let dueText: string;
  let badgeColor: 'success' | 'warning' | 'danger' | 'info' | 'neutral';

  const dateFormatted = targetDateOnly.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (latestPaidEnd && latestPaidEnd > today && diffDays > 7) {
    dueStatus = 'paid';
    dueText = `Lunas (sd ${dateFormatted})`;
    badgeColor = 'success';
  } else if (diffDays < 0) {
    dueStatus = 'overdue';
    const lateDays = Math.abs(diffDays);
    dueText = `Terlambat ${lateDays} hari (${dateFormatted})`;
    badgeColor = 'danger';
  } else if (diffDays === 0) {
    dueStatus = 'due_today';
    dueText = `Jatuh tempo hari ini! (${dateFormatted})`;
    badgeColor = 'danger';
  } else if (diffDays === 1) {
    dueStatus = 'due_soon';
    dueText = `Jatuh tempo besok (${dateFormatted})`;
    badgeColor = 'warning';
  } else if (diffDays <= 7) {
    dueStatus = 'due_soon';
    dueText = `Jatuh tempo ${diffDays} hari lagi (${dateFormatted})`;
    badgeColor = 'warning';
  } else {
    dueStatus = 'upcoming';
    dueText = `Jatuh tempo: ${dateFormatted}`;
    badgeColor = 'neutral';
  }

  // Calculate periodStart for quick payment recording (1 month before targetDueDate)
  const prevPeriodStart = addMonthsSafely(targetDueDate, -1, originalDay);

  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    nextDueDate: formatYMD(targetDateOnly),
    nextDueDateFormatted: dateFormatted,
    daysRemaining: diffDays,
    dueStatus,
    dueText,
    badgeColor,
    suggestedPeriodStart: formatYMD(prevPeriodStart),
    suggestedPeriodEnd: formatYMD(targetDateOnly),
  };
}

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
            payments: {
              orderBy: { periodEnd: 'desc' },
              take: 5,
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

  const mappedTenants = tenants.map((t) => {
    const meta = unpackTenantNotes(t.notes);
    return {
      ...t,
      notes: meta.notes,
      idCardNumber: meta.idCardNumber,
      emergencyPhone: meta.emergencyPhone,
      phone: t.whatsapp || '',
      whatsapp: t.whatsapp || '',
      stays: t.stays.map((s) => {
        const dueInfo = s.status === 'active' ? calculateDueInfo(s.checkInDate, s.payments) : null;
        return {
        ...s,
        startDate: s.checkInDate.toISOString(),
        endDate: s.checkOutDate ? s.checkOutDate.toISOString() : null,
        rentAmount: Number(s.rentPrice),
        deposit: Number(s.deposit),
        dueInfo,
        payments: s.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
        room: s.room ? {
          ...s.room,
          propertyId: s.room.propertyId,
          property: s.room.property || { id: '', name: 'Properti', city: '' },
        } : null,
      };
    }),
  };
});

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

  const packedNotes = packTenantNotes(input.notes, input.idCardNumber, input.emergencyPhone);

  const tenant = await prisma.tenant.create({
    data: {
      ownerId,
      name: input.name,
      whatsapp: cleanPhone || null,
      notes: packedNotes,
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

  const meta = unpackTenantNotes(tenant.notes);

  return {
    ...tenant,
    notes: meta.notes,
    idCardNumber: meta.idCardNumber,
    emergencyPhone: meta.emergencyPhone,
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

  const existingMeta = unpackTenantNotes(existing.notes);
  const updatedIdCardNumber = input.idCardNumber !== undefined ? input.idCardNumber : existingMeta.idCardNumber;
  const updatedEmergencyPhone = input.emergencyPhone !== undefined ? input.emergencyPhone : existingMeta.emergencyPhone;
  const updatedNotes = input.notes !== undefined ? input.notes : existingMeta.notes;
  const packedNotes = packTenantNotes(updatedNotes, updatedIdCardNumber, updatedEmergencyPhone);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(input.name && { name: input.name }),
      ...(cleanPhone !== undefined && { whatsapp: cleanPhone || null }),
      notes: packedNotes,
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
