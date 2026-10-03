import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { sendSuccess } from '../../utils/response';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { checkPropertyLimit, checkRoomLimit, checkTenantLimit } from '../../utils/subscription';

const router = Router();
router.use(authenticate, authorize('owner'));

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err) { next(err); }
  };

// ── Dashboard summary ─────────────────────────
router.get('/dashboard', handle(async (req, res) => {
  const ownerId = req.user!.sub;

  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalProperties,
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    roomsAggregate,
    revenueThisMonth,
    revenueLastMonth,
    revenueTotal,
    pendingPayments,
    overduePayments,
    activeTenantsCount,
    activeSubscription,
  ] = await Promise.all([
    prisma.property.count({ where: { ownerId, status: { not: 'inactive' } } }),
    prisma.room.count({ where: { ownerId } }),
    prisma.room.count({ where: { ownerId, status: 'occupied' } }),
    prisma.room.count({ where: { ownerId, status: 'available' } }),
    prisma.room.count({ where: { ownerId, status: 'maintenance' } }),
    prisma.room.aggregate({
      where: { ownerId },
      _sum: { price: true },
    }),
    prisma.tenantPayment.aggregate({
      where: {
        ownerId,
        status: 'paid',
        OR: [
          { paymentDate: { gte: startOfCurrentMonth, lt: startOfNextMonth } },
          { periodStart: { gte: startOfCurrentMonth, lt: startOfNextMonth } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.tenantPayment.aggregate({
      where: {
        ownerId,
        status: 'paid',
        OR: [
          { paymentDate: { gte: startOfLastMonth, lt: startOfCurrentMonth } },
          { periodStart: { gte: startOfLastMonth, lt: startOfCurrentMonth } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.tenantPayment.aggregate({
      where: { ownerId, status: 'paid' },
      _sum: { amount: true },
    }),
    prisma.tenantPayment.aggregate({
      where: { ownerId, status: 'pending' },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.tenantPayment.aggregate({
      where: { ownerId, status: 'overdue' },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.tenantStay.count({
      where: { ownerId, status: 'active' },
    }),
    prisma.subscription.findFirst({
      where: { ownerId, status: { in: ['trial', 'active', 'expiring_soon'] } },
      include: { plan: true },
      orderBy: { endsAt: 'desc' },
    }),
  ]);

  const daysLeft = activeSubscription
    ? Math.max(0, Math.ceil((activeSubscription.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const [propLimit, roomLimit, tenantLimit] = activeSubscription
    ? await Promise.all([
        checkPropertyLimit(ownerId, activeSubscription.planId),
        checkRoomLimit(ownerId, activeSubscription.planId),
        checkTenantLimit(ownerId, activeSubscription.planId),
      ])
    : [
        { allowed: false, current: totalProperties, limit: 0 },
        { allowed: false, current: totalRooms, limit: 0 },
        { allowed: false, current: 0, limit: 0 },
      ];

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const potentialMonthlyRevenue = Number(roomsAggregate._sum.price ?? 0);
  const revenueThisMonthNum = Number(revenueThisMonth._sum.amount ?? 0);
  const revenueLastMonthNum = Number(revenueLastMonth._sum.amount ?? 0);
  const revenueTotalNum = Number(revenueTotal._sum.amount ?? 0);

  // Month over month growth calculation
  let momGrowthPercent = 0;
  if (revenueLastMonthNum > 0) {
    momGrowthPercent = Math.round(((revenueThisMonthNum - revenueLastMonthNum) / revenueLastMonthNum) * 100);
  } else if (revenueThisMonthNum > 0) {
    momGrowthPercent = 100;
  }

  sendSuccess(res, {
    totalProperties,
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    occupancyRate,
    revenueThisMonth: revenueThisMonthNum,
    revenueLastMonth: revenueLastMonthNum,
    momGrowthPercent,
    revenueTotal: revenueTotalNum,
    potentialMonthlyRevenue,
    activeTenantsCount,
    pendingPayments: pendingPayments._count.id,
    pendingPaymentsAmount: Number(pendingPayments._sum.amount ?? 0),
    overduePayments: overduePayments._count.id,
    overduePaymentsAmount: Number(overduePayments._sum.amount ?? 0),
    subscription: activeSubscription
      ? {
          planName: activeSubscription.plan.name,
          status: activeSubscription.status,
          startsAt: activeSubscription.startsAt,
          endsAt: activeSubscription.endsAt,
          daysLeft,
          usage: {
            properties: propLimit,
            rooms: roomLimit,
            tenants: tenantLimit,
          },
        }
      : null,
  });
}));

// ── Occupancy report per property ─────────────
router.get('/occupancy', handle(async (req, res) => {
  const ownerId = req.user!.sub;

  const properties = await prisma.property.findMany({
    where: { ownerId },
    include: {
      rooms: {
        select: {
          id: true,
          roomNumber: true,
          type: true,
          price: true,
          status: true,
          stays: {
            where: { status: 'active' },
            select: {
              id: true,
              rentPrice: true,
              checkInDate: true,
              tenant: { select: { id: true, name: true, whatsapp: true } },
            },
          },
        },
        orderBy: { roomNumber: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const detailedProperties = properties.map((p) => {
    const totalRooms = p.rooms.length;
    const occupiedRooms = p.rooms.filter((r) => r.status === 'occupied').length;
    const availableRooms = p.rooms.filter((r) => r.status === 'available').length;
    const maintenanceRooms = p.rooms.filter((r) => r.status === 'maintenance').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const monthlyPotential = p.rooms.reduce((sum, r) => sum + Number(r.price), 0);
    const monthlyActiveRent = p.rooms.reduce((sum, r) => {
      const activeStay = r.stays[0];
      return sum + (activeStay ? Number(activeStay.rentPrice) : 0);
    }, 0);

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      city: p.city,
      type: p.type,
      status: p.status,
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      occupancyRate,
      monthlyPotential,
      monthlyActiveRent,
      _count: { rooms: totalRooms },
      rooms: p.rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        type: r.type,
        price: Number(r.price),
        status: r.status,
        activeStay: r.stays[0]
          ? {
              id: r.stays[0].id,
              rentPrice: Number(r.stays[0].rentPrice),
              checkInDate: r.stays[0].checkInDate,
              tenantName: r.stays[0].tenant.name,
              tenantPhone: r.stays[0].tenant.whatsapp,
            }
          : null,
      })),
    };
  });

  sendSuccess(res, detailedProperties);
}));

// ── Revenue report ────────────────────────────
router.get('/revenue', handle(async (req, res) => {
  const ownerId = req.user!.sub;
  const q = req.query as any;

  // Build where conditions
  const where: any = { ownerId };

  // Status filter (default to 'paid' if not specified or 'all')
  if (q.status && q.status !== 'all') {
    where.status = q.status;
  } else if (!q.status) {
    where.status = 'paid';
  }

  // Payment method filter
  if (q.paymentMethod && q.paymentMethod !== 'all') {
    where.paymentMethod = q.paymentMethod;
  }

  // Date filters
  if (q.from || q.to) {
    const dateFilters: any = {};
    if (q.from) dateFilters.gte = new Date(q.from);
    if (q.to) {
      const endD = new Date(q.to);
      endD.setHours(23, 59, 59, 999);
      dateFilters.lte = endD;
    }

    where.OR = [
      { paymentDate: dateFilters },
      { periodStart: dateFilters },
    ];
  }

  // Property filter
  if (q.propertyId && q.propertyId !== 'all') {
    where.tenantStay = {
      room: {
        propertyId: q.propertyId,
      },
    };
  }

  const isAll = q.perPage === 'all' || q.perPage === '-1';
  const { page, perPage, skip } = getPaginationParams(q);

  const [total, payments, aggregatePaid, aggregateAll] = await Promise.all([
    prisma.tenantPayment.count({ where }),
    prisma.tenantPayment.findMany({
      where,
      include: {
        tenantStay: {
          include: {
            tenant: { select: { id: true, name: true, whatsapp: true } },
            room: {
              select: {
                id: true,
                roomNumber: true,
                type: true,
                property: { select: { id: true, name: true, city: true } },
              },
            },
          },
        },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      ...(isAll ? {} : { skip, take: perPage }),
    }),
    prisma.tenantPayment.aggregate({
      where: { ...where, status: 'paid' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.tenantPayment.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  // Breakdown by payment method
  const methodMap: Record<string, { count: number; total: number }> = {
    bank_transfer: { count: 0, total: 0 },
    cash: { count: 0, total: 0 },
    other: { count: 0, total: 0 },
  };

  const propertyMap: Record<string, { propertyName: string; count: number; total: number }> = {};

  for (const p of payments) {
    const m = p.paymentMethod || 'other';
    if (!methodMap[m]) methodMap[m] = { count: 0, total: 0 };
    methodMap[m].count += 1;
    methodMap[m].total += Number(p.amount);

    const propId = p.tenantStay?.room?.property?.id || 'unknown';
    const propName = p.tenantStay?.room?.property?.name || 'Tanpa Properti';
    if (!propertyMap[propId]) propertyMap[propId] = { propertyName: propName, count: 0, total: 0 };
    propertyMap[propId].count += 1;
    propertyMap[propId].total += Number(p.amount);
  }

  const mappedPayments = payments.map((p) => ({
    ...p,
    amount: Number(p.amount),
  }));

  sendSuccess(
    res,
    {
      payments: mappedPayments,
      totalAmount: Number(aggregateAll._sum.amount ?? 0),
      totalPaidAmount: Number(aggregatePaid._sum.amount ?? 0),
      totalPaidCount: aggregatePaid._count.id,
      breakdownByMethod: methodMap,
      breakdownByProperty: Object.entries(propertyMap).map(([id, val]) => ({
        propertyId: id,
        propertyName: val.propertyName,
        count: val.count,
        total: val.total,
      })),
    },
    { meta: isAll ? { total, page: 1, perPage: total, totalPages: 1 } : buildPaginationMeta(total, page, perPage) }
  );
}));

export default router;
