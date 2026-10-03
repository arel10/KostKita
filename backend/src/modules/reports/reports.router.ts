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

  const [
    totalProperties,
    totalRooms,
    occupiedRooms,
    availableRooms,
    revenueThisMonth,
    revenueTotal,
    pendingPayments,
    overduePayments,
    activeSubscription,
  ] = await Promise.all([
    prisma.property.count({ where: { ownerId, status: { not: 'inactive' } } }),
    prisma.room.count({ where: { ownerId } }),
    prisma.room.count({ where: { ownerId, status: 'occupied' } }),
    prisma.room.count({ where: { ownerId, status: 'available' } }),
    prisma.tenantPayment.aggregate({
      where: {
        ownerId,
        status: 'paid',
        periodStart: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
    prisma.tenantPayment.aggregate({
      where: { ownerId, status: 'paid' },
      _sum: { amount: true },
    }),
    prisma.tenantPayment.count({ where: { ownerId, status: 'pending' } }),
    prisma.tenantPayment.count({ where: { ownerId, status: 'overdue' } }),
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

  sendSuccess(res, {
    totalProperties,
    totalRooms,
    occupiedRooms,
    availableRooms,
    occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
    revenueTotal: revenueTotal._sum.amount ?? 0,
    pendingPayments,
    overduePayments,
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

// ── Occupancy report ──────────────────────────
router.get('/occupancy', handle(async (req, res) => {
  const ownerId = req.user!.sub;

  const properties = await prisma.property.findMany({
    where: { ownerId },
    include: {
      _count: {
        select: {
          rooms: true,
        },
      },
    },
  });

  sendSuccess(res, properties);
}));

// ── Revenue report ────────────────────────────
router.get('/revenue', handle(async (req, res) => {
  const ownerId = req.user!.sub;
  const q = req.query as any;
  const { page, perPage, skip } = getPaginationParams(q);

  const where: any = {
    ownerId,
    status: 'paid',
    ...(q.from && { periodStart: { gte: new Date(q.from) } }),
    ...(q.to && { periodEnd: { lte: new Date(q.to) } }),
  };

  const [total, payments, aggregate] = await Promise.all([
    prisma.tenantPayment.count({ where }),
    prisma.tenantPayment.findMany({
      where,
      include: {
        tenantStay: {
          include: {
            tenant: { select: { name: true } },
            room: { select: { roomNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.tenantPayment.aggregate({ where, _sum: { amount: true } }),
  ]);

  sendSuccess(res, {
    payments,
    totalAmount: aggregate._sum.amount ?? 0,
  }, { meta: buildPaginationMeta(total, page, perPage) });
}));

export default router;
