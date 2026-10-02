import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendError, getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { createNotification } from '../../utils/notification';
import { AuditAction, EntityType } from '../../types/constants';

const router = Router();
router.use(authenticate, authorize('super_admin'));

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err: any) {
      if (err.code) sendError(res, err.code, err.message, err.status ?? 400);
      else next(err);
    }
  };

// ── Dashboard ─────────────────────────────────
router.get('/dashboard', handle(async (req, res) => {
  const [
    totalOwners,
    activeOwners,
    suspendedOwners,
    totalProperties,
    activeListings,
    pendingPayments,
    pendingReports,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'owner' } }),
    prisma.user.count({ where: { role: 'owner', status: 'active' } }),
    prisma.user.count({ where: { role: 'owner', status: 'suspended' } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: 'active' } }),
    prisma.subscriptionPayment.count({ where: { status: 'pending' } }),
    prisma.listingReport.count({ where: { status: 'pending' } }),
  ]);

  sendSuccess(res, { totalOwners, activeOwners, suspendedOwners, totalProperties, activeListings, pendingPayments, pendingReports });
}));

// ── Owner Management ──────────────────────────
router.get('/owners', handle(async (req, res) => {
  const q = req.query as any;
  const { page, perPage, skip } = getPaginationParams(q);

  const where: any = {
    role: 'owner',
    ...(q.status && { status: q.status }),
    ...(q.search && {
      OR: [
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, owners] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, status: true, createdAt: true, lastLoginAt: true,
        _count: { select: { properties: true, subscriptions: true } },
        subscriptions: {
          where: { status: { in: ['trial', 'active', 'expiring_soon'] } },
          include: { plan: { select: { name: true } } },
          take: 1,
          orderBy: { endsAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  sendSuccess(res, owners, { meta: buildPaginationMeta(total, page, perPage) });
}));

router.get('/owners/:id', handle(async (req, res) => {
  const owner = await prisma.user.findFirst({
    where: { id: req.params.id, role: 'owner' },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
      properties: { include: { _count: { select: { rooms: true } } } },
    },
  });
  if (!owner) { sendError(res, 'NOT_FOUND', 'Owner tidak ditemukan.', 404); return; }

  const { passwordHash, ...safeOwner } = owner as any;
  sendSuccess(res, safeOwner);
}));

const suspendSchema = z.object({ reason: z.string().min(5, 'Alasan minimal 5 karakter') });

router.post('/owners/:id/suspend', validate(suspendSchema), handle(async (req, res) => {
  const owner = await prisma.user.findFirst({ where: { id: req.params.id, role: 'owner' } });
  if (!owner) { sendError(res, 'NOT_FOUND', 'Owner tidak ditemukan.', 404); return; }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: req.params.id }, data: { status: 'suspended' } });
    await tx.property.updateMany({ where: { ownerId: req.params.id }, data: { status: 'inactive' } });
  });

  await createNotification({ userId: req.params.id, type: 'owner_suspended', title: 'Akun Disuspend', message: `Akun Anda telah disuspend. Alasan: ${req.body.reason}` });
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.OWNER_SUSPEND, entityType: EntityType.USER, entityId: req.params.id, newValue: { reason: req.body.reason }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

  sendSuccess(res, null, { message: 'Owner berhasil disuspend.' });
}));

router.post('/owners/:id/activate', handle(async (req, res) => {
  const owner = await prisma.user.findFirst({ where: { id: req.params.id, role: 'owner' } });
  if (!owner) { sendError(res, 'NOT_FOUND', 'Owner tidak ditemukan.', 404); return; }

  await prisma.user.update({ where: { id: req.params.id }, data: { status: 'active' } });
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.OWNER_ACTIVATE, entityType: EntityType.USER, entityId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

  sendSuccess(res, null, { message: 'Owner berhasil diaktifkan.' });
}));

// ── Listing Management ────────────────────────
router.get('/properties', handle(async (req, res) => {
  const q = req.query as any;
  const { page, perPage, skip } = getPaginationParams(q);

  const where: any = {
    ...(q.status && { status: q.status }),
    ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
  };

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        photos: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  sendSuccess(res, properties, { meta: buildPaginationMeta(total, page, perPage) });
}));

router.post('/properties/:id/suspend', validate(suspendSchema), handle(async (req, res) => {
  const property = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!property) { sendError(res, 'NOT_FOUND', 'Properti tidak ditemukan.', 404); return; }

  await prisma.property.update({ where: { id: req.params.id }, data: { status: 'suspended', suspendedReason: req.body.reason } });

  await createNotification({ userId: property.ownerId, type: 'listing_suspended', title: 'Listing Disuspend', message: `Listing ${property.name} telah disuspend. Alasan: ${req.body.reason}` });
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.PROPERTY_SUSPEND, entityType: EntityType.PROPERTY, entityId: req.params.id, newValue: { reason: req.body.reason }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

  sendSuccess(res, null, { message: 'Listing berhasil disuspend.' });
}));

router.post('/properties/:id/activate', handle(async (req, res) => {
  await prisma.property.update({ where: { id: req.params.id }, data: { status: 'active', suspendedReason: null } });
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.PROPERTY_ACTIVATE, entityType: EntityType.PROPERTY, entityId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  sendSuccess(res, null, { message: 'Listing berhasil diaktifkan.' });
}));

// ── Listing Reports ───────────────────────────
router.get('/listing-reports', handle(async (req, res) => {
  const q = req.query as any;
  const { page, perPage, skip } = getPaginationParams(q);

  const [total, reports] = await Promise.all([
    prisma.listingReport.count({ where: q.status ? { status: q.status } : {} }),
    prisma.listingReport.findMany({
      where: q.status ? { status: q.status } : {},
      include: { property: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  sendSuccess(res, reports, { meta: buildPaginationMeta(total, page, perPage) });
}));

router.patch('/listing-reports/:id', handle(async (req, res) => {
  await prisma.listingReport.update({
    where: { id: req.params.id },
    data: { status: req.body.status, reviewedBy: req.user!.sub, reviewedAt: new Date() },
  });
  sendSuccess(res, null, { message: 'Laporan berhasil diperbarui.' });
}));

// ── Audit Logs ────────────────────────────────
router.get('/audit-logs', handle(async (req, res) => {
  const q = req.query as any;
  const { page, perPage, skip } = getPaginationParams(q);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { actor: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  sendSuccess(res, logs, { meta: buildPaginationMeta(total, page, perPage) });
}));

// ── Plan Management ───────────────────────────
const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  price: z.number().min(0),
  durationDays: z.number().int().positive(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  features: z.array(z.object({ featureKey: z.string(), featureValue: z.string() })).optional(),
});

router.get('/plans', handle(async (req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    include: { features: true },
    orderBy: { sortOrder: 'asc' },
  });
  sendSuccess(res, plans);
}));

router.post('/plans', validate(createPlanSchema), handle(async (req, res) => {
  const { features, ...planData } = req.body;
  const slugify = (await import('slugify')).default;
  const slug = slugify(planData.name, { lower: true, strict: true });

  const plan = await prisma.$transaction(async (tx) => {
    if (planData.isDefault) {
      await tx.subscriptionPlan.updateMany({ data: { isDefault: false } });
    }
    const newPlan = await tx.subscriptionPlan.create({ data: { ...planData, slug } });
    if (features?.length) {
      await tx.subscriptionPlanFeature.createMany({
        data: features.map((f: any) => ({ planId: newPlan.id, featureKey: f.featureKey, featureValue: f.featureValue })),
      });
    }
    return newPlan;
  });

  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.PLAN_CREATE, entityType: EntityType.PLAN, entityId: plan.id, newValue: planData });
  sendSuccess(res, plan, { statusCode: 201 });
}));

router.patch('/plans/:id', handle(async (req, res) => {
  const { features, ...planData } = req.body;
  const plan = await prisma.$transaction(async (tx) => {
    if (planData.isDefault) {
      await tx.subscriptionPlan.updateMany({ data: { isDefault: false } });
    }
    const updated = await tx.subscriptionPlan.update({ where: { id: req.params.id }, data: planData });
    if (features !== undefined) {
      await tx.subscriptionPlanFeature.deleteMany({ where: { planId: req.params.id } });
      if (features.length > 0) {
        await tx.subscriptionPlanFeature.createMany({
          data: features.map((f: any) => ({ planId: req.params.id, featureKey: f.featureKey, featureValue: f.featureValue })),
        });
      }
    }
    return updated;
  });
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.PLAN_UPDATE, entityType: EntityType.PLAN, entityId: req.params.id });
  sendSuccess(res, plan, { message: 'Paket berhasil diperbarui.' });
}));

// ── System Settings ───────────────────────────
router.get('/settings', handle(async (req, res) => {
  const settings = await prisma.systemSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  sendSuccess(res, map);
}));

router.patch('/settings', handle(async (req, res) => {
  const entries = Object.entries(req.body as Record<string, string>);
  await Promise.all(
    entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value, updatedBy: req.user!.sub },
        create: { key, value, updatedBy: req.user!.sub },
      })
    )
  );
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.SETTINGS_UPDATE, entityType: EntityType.SYSTEM_SETTING, newValue: req.body });
  sendSuccess(res, null, { message: 'Pengaturan berhasil disimpan.' });
}));

export default router;
