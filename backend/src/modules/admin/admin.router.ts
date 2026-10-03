import path from 'path';
import fs from 'fs';
import os from 'os';
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { uploadImages } from '../../middleware/upload';
import { cloudinary } from '../../config/storage';
import { env } from '../../config/env';
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

// ── Helpers ───────────────────────────────────
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const lastMonths = (n: number) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
};

// ── Dashboard ─────────────────────────────────
router.get('/dashboard', handle(async (req, res) => {
  const sixMonthsAgo = lastMonths(6)[0];
  const [
    totalOwners,
    activeOwners,
    suspendedOwners,
    totalProperties,
    activeListings,
    inactiveListings,
    pendingPayments,
    pendingReports,
    activeSubscriptions,
    revenueAgg,
    recentOwners,
    recentSubscriptions,
    recentPayments,
    recentProperties,
    recentReports,
    recentSuspends,
    ownersTrend,
    paymentsTrend,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'owner' } }),
    prisma.user.count({ where: { role: 'owner', status: 'active' } }),
    prisma.user.count({ where: { role: 'owner', status: 'suspended' } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: 'active' } }),
    prisma.property.count({ where: { status: { in: ['inactive', 'suspended'] } } }),
    prisma.subscriptionPayment.count({ where: { status: 'pending' } }),
    prisma.listingReport.count({ where: { status: 'pending' } }),
    prisma.subscription.count({ where: { status: { in: ['active', 'expiring_soon'] } } }),
    prisma.subscriptionPayment.aggregate({ _sum: { amount: true }, where: { status: 'approved', reviewedAt: { gte: startOfMonth() } } }),
    prisma.user.findMany({ where: { role: 'owner' }, select: { id: true, name: true, email: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.subscription.findMany({ include: { owner: { select: { name: true } }, plan: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.subscriptionPayment.findMany({ where: { status: 'pending' }, include: { owner: { select: { name: true } }, plan: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.property.findMany({ select: { id: true, name: true, status: true, createdAt: true, owner: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.listingReport.findMany({ include: { property: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.auditLog.findMany({ where: { action: { in: ['owner.suspend', 'property.suspend'] } }, include: { actor: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.user.findMany({ where: { role: 'owner', createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.subscriptionPayment.findMany({ where: { status: 'approved', reviewedAt: { gte: sixMonthsAgo } }, select: { amount: true, reviewedAt: true } }),
  ]);

  const months = lastMonths(6).map((d) => ({ key: monthKey(d), label: d.toLocaleDateString('id-ID', { month: 'short' }), owners: 0, revenue: 0 }));
  ownersTrend.forEach((o) => { const m = months.find((x) => x.key === monthKey(o.createdAt)); if (m) m.owners += 1; });
  paymentsTrend.forEach((p) => { const m = months.find((x) => x.key === monthKey(p.reviewedAt!)); if (m) m.revenue += Number(p.amount); });

  sendSuccess(res, {
    totalOwners, activeOwners, suspendedOwners, totalProperties, activeListings, inactiveListings,
    pendingPayments, pendingReports, activeSubscriptions,
    monthlyRevenue: Number(revenueAgg._sum.amount ?? 0),
    trend: months,
    recentActivity: { owners: recentOwners, subscriptions: recentSubscriptions, payments: recentPayments, properties: recentProperties, reports: recentReports, suspends: recentSuspends },
  });
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

router.get('/properties/:id', handle(async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true, status: true } },
      photos: { orderBy: { order: 'asc' } },
      facilities: true,
      rules: true,
      rooms: { select: { id: true, roomNumber: true, name: true, price: true, status: true } },
      reports: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!property) { sendError(res, 'NOT_FOUND', 'Properti tidak ditemukan.', 404); return; }
  sendSuccess(res, property);
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

router.get('/listing-reports/:id', handle(async (req, res) => {
  const report = await prisma.listingReport.findUnique({
    where: { id: req.params.id },
    include: { property: { select: { id: true, name: true, slug: true, status: true, owner: { select: { id: true, name: true, email: true } } } } },
  });
  if (!report) { sendError(res, 'NOT_FOUND', 'Laporan tidak ditemukan.', 404); return; }
  sendSuccess(res, report);
}));

const reportStatusSchema = z.object({ status: z.enum(['pending', 'reviewed', 'resolved']) });

router.patch('/listing-reports/:id', validate(reportStatusSchema), handle(async (req, res) => {
  const existing = await prisma.listingReport.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendError(res, 'NOT_FOUND', 'Laporan tidak ditemukan.', 404); return; }
  await prisma.listingReport.update({
    where: { id: req.params.id },
    data: { status: req.body.status, reviewedBy: req.user!.sub, reviewedAt: new Date() },
  });
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: AuditAction.LISTING_REPORT_REVIEW, entityType: EntityType.LISTING_REPORT, entityId: req.params.id, oldValue: { status: existing.status }, newValue: { status: req.body.status }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  sendSuccess(res, null, { message: 'Laporan berhasil diperbarui.' });
}));

// ── Audit Logs ────────────────────────────────
router.get('/audit-logs', handle(async (req, res) => {
  const q = req.query as any;
  const { page, perPage, skip } = getPaginationParams(q);

  const where: any = {
    ...(q.action && { action: { contains: q.action, mode: 'insensitive' } }),
    ...(q.entityType && { entityType: q.entityType }),
    ...(q.actorId && { actorId: q.actorId }),
    ...((q.from || q.to) && {
      createdAt: {
        ...(q.from && { gte: new Date(q.from) }),
        ...(q.to && { lte: new Date(new Date(q.to).setHours(23, 59, 59, 999)) }),
      },
    }),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
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

const updatePlanSchema = createPlanSchema.partial().extend({ isActive: z.boolean().optional() });

router.get('/plans/:id', handle(async (req, res) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id }, include: { features: true } });
  if (!plan) { sendError(res, 'NOT_FOUND', 'Paket tidak ditemukan.', 404); return; }
  sendSuccess(res, plan);
}));

router.delete('/plans/:id', handle(async (req, res) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id }, include: { _count: { select: { subscriptions: true, payments: true } } } });
  if (!plan) { sendError(res, 'NOT_FOUND', 'Paket tidak ditemukan.', 404); return; }
  if (plan.isDefault) { sendError(res, 'PLAN_DEFAULT', 'Paket default tidak dapat dihapus.', 409); return; }
  const used = plan._count.subscriptions + plan._count.payments > 0;
  if (used) {
    await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { isActive: false } });
  } else {
    await prisma.subscriptionPlan.delete({ where: { id: plan.id } });
  }
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: 'plan.delete', entityType: EntityType.PLAN, entityId: plan.id, newValue: { softDeleted: used }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  sendSuccess(res, null, { message: used ? 'Paket sudah dipakai, dinonaktifkan.' : 'Paket berhasil dihapus.' });
}));

router.patch('/plans/:id', validate(updatePlanSchema), handle(async (req, res) => {
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

router.post('/settings/upload-qris', uploadImages.single('qris'), handle(async (req, res) => {
  const file = req.file;
  if (!file) {
    sendError(res, 'NO_FILE', 'File gambar QRIS tidak ditemukan.', 400);
    return;
  }

  let qrisUrl = '';
  const hasCloudinary = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  if (hasCloudinary) {
    try {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'kostkita/qris', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        ).end(file.buffer);
      });
      qrisUrl = result.secure_url;
    } catch (cloudErr) {
      console.warn('Cloudinary upload failed for QRIS, fallback to local:', cloudErr);
    }
  }

  if (!qrisUrl) {
    const uploadDir = path.resolve(process.cwd(), 'uploads/settings');
    fs.mkdirSync(uploadDir, { recursive: true });
    const ext = path.extname(file.originalname) || '.png';
    const filename = `qris-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    qrisUrl = `${env.APP_URL}/uploads/settings/${filename}`;
  }

  await prisma.systemSetting.upsert({
    where: { key: 'payment_qris_image_url' },
    update: { value: qrisUrl, updatedBy: req.user!.sub },
    create: { key: 'payment_qris_image_url', value: qrisUrl, description: 'URL Gambar QRIS Pembayaran', updatedBy: req.user!.sub },
  });

  await logAudit({
    actorId: req.user!.sub,
    actorRole: 'super_admin',
    action: AuditAction.SETTINGS_UPDATE,
    entityType: EntityType.SYSTEM_SETTING,
    newValue: { payment_qris_image_url: qrisUrl },
  });

  sendSuccess(res, { url: qrisUrl }, { message: 'Gambar QRIS berhasil diunggah.' });
}));

// ── Subscriptions ─────────────────────────────
router.get('/subscriptions', handle(async (req, res) => {
  const q = req.query as any;
  const { page, perPage, skip } = getPaginationParams(q);
  const where: any = {
    ...(q.status && { status: q.status }),
    ...(q.planId && { planId: q.planId }),
    ...(q.search && {
      owner: {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ]
      },
    }),
  };
  const [total, subs] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true } }, plan: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);
  sendSuccess(res, subs, { meta: buildPaginationMeta(total, page, perPage) });
}));

// ── Payment Detail ────────────────────────────
router.get('/payments/:id', handle(async (req, res) => {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      plan: { select: { id: true, name: true, price: true, durationDays: true } },
      reviewer: { select: { name: true } },
    },
  });
  if (!payment) { sendError(res, 'NOT_FOUND', 'Pembayaran tidak ditemukan.', 404); return; }
  sendSuccess(res, payment);
}));

// ── Platform Reports ──────────────────────────
router.get('/reports/overview', handle(async (req, res) => {
  const n = Math.min(24, Math.max(1, parseInt(String((req.query as any).months ?? '6'), 10)));
  const months = lastMonths(n);
  const from = months[0];

  const [owners, payments, activeSubs, totalOwners, payingOwners, plans] = await Promise.all([
    prisma.user.findMany({ where: { role: 'owner', createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.subscriptionPayment.findMany({ where: { status: 'approved', reviewedAt: { gte: from } }, select: { amount: true, reviewedAt: true } }),
    prisma.subscription.groupBy({ by: ['planId'], where: { status: { in: ['trial', 'active', 'expiring_soon'] } }, _count: { _all: true } }),
    prisma.user.count({ where: { role: 'owner' } }),
    prisma.subscriptionPayment.groupBy({ by: ['ownerId'], where: { status: 'approved' } }),
    prisma.subscriptionPlan.findMany({ select: { id: true, name: true } }),
  ]);

  const series = months.map((d) => ({ key: monthKey(d), label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), owners: 0, revenue: 0 }));
  owners.forEach((o) => { const m = series.find((x) => x.key === monthKey(o.createdAt)); if (m) m.owners += 1; });
  payments.forEach((p) => { const m = series.find((x) => x.key === monthKey(p.reviewedAt!)); if (m) m.revenue += Number(p.amount); });

  const planName = new Map(plans.map((p) => [p.id, p.name]));
  const distribution = activeSubs.map((a) => ({ plan: planName.get(a.planId) ?? 'Unknown', count: a._count._all }));

  sendSuccess(res, {
    series,
    totalRevenue: series.reduce((s, m) => s + m.revenue, 0),
    newOwners: series.reduce((s, m) => s + m.owners, 0),
    distribution,
    conversion: { totalOwners, payingOwners: payingOwners.length, rate: totalOwners ? Math.round((payingOwners.length / totalOwners) * 1000) / 10 : 0 },
  });
}));

// ── Notifications / Announcements ─────────────
const announcementSchema = z.object({
  title: z.string().min(3).max(150),
  message: z.string().min(5).max(2000),
  target: z.enum(['all', 'active', 'suspended']).default('all'),
});

router.post('/notifications/announcement', validate(announcementSchema), handle(async (req, res) => {
  const { title, message, target } = req.body;
  const owners = await prisma.user.findMany({
    where: { role: 'owner', ...(target !== 'all' && { status: target }) },
    select: { id: true },
  });
  const { randomUUID } = await import('crypto');
  const announcementId = randomUUID();
  if (owners.length) {
    await prisma.notification.createMany({
      data: owners.map((o) => ({ userId: o.id, type: 'system_announcement' as const, title, message, data: { announcementId, target, by: req.user!.sub } })),
    });
  }
  await logAudit({ actorId: req.user!.sub, actorRole: 'super_admin', action: 'notification.announcement', entityType: 'notification', entityId: announcementId, newValue: { title, target, recipients: owners.length }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  sendSuccess(res, { announcementId, recipients: owners.length }, { statusCode: 201, message: 'Pengumuman berhasil dikirim.' });
}));

router.get('/notifications', handle(async (req, res) => {
  const rows = await prisma.notification.findMany({
    where: { type: { in: ['system_announcement', 'owner_suspended', 'listing_suspended', 'payment_approved', 'payment_rejected'] } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const grouped: any[] = [];
  const seen = new Map<string, any>();
  for (const r of rows) {
    const id = (r.data as any)?.announcementId;
    if (id) {
      if (seen.has(id)) { seen.get(id).recipients += 1; continue; }
      const item = { id, type: r.type, title: r.title, message: r.message, createdAt: r.createdAt, recipients: 1, target: (r.data as any)?.target };
      seen.set(id, item); grouped.push(item);
    } else {
      grouped.push({ id: r.id, type: r.type, title: r.title, message: r.message, createdAt: r.createdAt, recipients: 1, to: r.user?.name });
    }
  }
  sendSuccess(res, grouped.slice(0, 50));
}));

// ── System Health & Monitoring ─────────────────
router.get('/system-health', handle(async (req, res) => {
  const dbStart = Date.now();
  let dbStatus = 'healthy';
  let dbLatency = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (err) {
    dbStatus = 'unhealthy';
    dbLatency = -1;
  }

  const mem = process.memoryUsage();
  const memory = {
    rss: Math.round(mem.rss / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    systemTotal: Math.round(os.totalmem() / 1024 / 1024),
    systemFree: Math.round(os.freemem() / 1024 / 1024),
  };

  const getDirInfo = (dirPath: string) => {
    let size = 0;
    let count = 0;
    if (fs.existsSync(dirPath)) {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          const sub = getDirInfo(full);
          size += sub.size;
          count += sub.count;
        } else {
          try {
            size += fs.statSync(full).size;
            count++;
          } catch {}
        }
      }
    }
    return { size, count };
  };

  const uploadDir = path.resolve(process.cwd(), 'uploads');
  const uploadStats = getDirInfo(uploadDir);

  const [usersCount, propertiesCount, roomsCount, tenantsCount, subsCount, paymentsCount, auditLogsCount] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.room.count(),
    prisma.tenant.count(),
    prisma.subscription.count(),
    prisma.subscriptionPayment.count(),
    prisma.auditLog.count(),
  ]);

  const uptimeSeconds = Math.floor(process.uptime());

  sendSuccess(res, {
    status: dbStatus === 'healthy' ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
      provider: 'PostgreSQL',
      counts: {
        users: usersCount,
        properties: propertiesCount,
        rooms: roomsCount,
        tenants: tenantsCount,
        subscriptions: subsCount,
        payments: paymentsCount,
        auditLogs: auditLogsCount,
      },
    },
    system: {
      uptimeSeconds,
      nodeVersion: process.version,
      platform: `${os.platform()} (${os.arch()})`,
      osRelease: os.release(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Standard CPU',
      processId: process.pid,
      environment: env.NODE_ENV,
    },
    memory,
    storage: {
      cloudinaryConfigured: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
      cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME || null,
      localUploadsCount: uploadStats.count,
      localUploadsSizeMb: Math.round((uploadStats.size / 1024 / 1024) * 100) / 100,
    },
    services: {
      googleAuth: Boolean(env.GOOGLE_CLIENT_ID),
      rateLimiter: true,
      jwtAuth: true,
    },
  });
}));

// ── Banner Management ─────────────────────────
router.get('/banners', handle(async (req, res) => {
  const { getStoredBanners } = await import('../../utils/banners');
  const banners = await getStoredBanners();
  sendSuccess(res, banners);
}));

const bannerSchema = z.object({
  title: z.string().min(3).max(150),
  subtitle: z.string().min(3).max(300),
  badgeText: z.string().max(50).default('PROMO'),
  imageUrl: z.string().optional(),
  targetUrl: z.string().default('#/search'),
  theme: z.string().optional().default('slate'),
  ctaText: z.string().max(50).default('Lihat Promo'),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

router.post('/banners', validate(bannerSchema), handle(async (req, res) => {
  const { getStoredBanners, saveStoredBanners } = await import('../../utils/banners');
  const banners = await getStoredBanners();
  const { randomUUID } = await import('crypto');
  const newBanner = {
    id: `banner-${randomUUID()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  banners.push(newBanner);
  await saveStoredBanners(banners, req.user!.sub);
  sendSuccess(res, newBanner, { statusCode: 201, message: 'Banner berhasil ditambahkan.' });
}));

router.put('/banners/:id', validate(bannerSchema.partial()), handle(async (req, res) => {
  const { getStoredBanners, saveStoredBanners } = await import('../../utils/banners');
  const banners = await getStoredBanners();
  const idx = banners.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    sendError(res, 'NOT_FOUND', 'Banner tidak ditemukan.', 404);
    return;
  }
  banners[idx] = {
    ...banners[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  await saveStoredBanners(banners, req.user!.sub);
  sendSuccess(res, banners[idx], { message: 'Banner berhasil diperbarui.' });
}));

router.delete('/banners/:id', handle(async (req, res) => {
  const { getStoredBanners, saveStoredBanners } = await import('../../utils/banners');
  const banners = await getStoredBanners();
  const filtered = banners.filter((b) => b.id !== req.params.id);
  if (filtered.length === banners.length) {
    sendError(res, 'NOT_FOUND', 'Banner tidak ditemukan.', 404);
    return;
  }
  await saveStoredBanners(filtered, req.user!.sub);
  sendSuccess(res, null, { message: 'Banner berhasil dihapus.' });
}));

router.post('/banners/upload', uploadImages.single('image'), handle(async (req, res) => {
  const file = req.file;
  if (!file) {
    sendError(res, 'NO_FILE', 'File gambar tidak ditemukan.', 400);
    return;
  }

  let imageUrl = '';
  const hasCloudinary = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  if (hasCloudinary) {
    try {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'kostkita/banners', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        ).end(file.buffer);
      });
      imageUrl = result.secure_url;
    } catch (cloudErr) {
      console.warn('Cloudinary upload failed for banner, fallback to local:', cloudErr);
    }
  }

  if (!imageUrl) {
    const uploadDir = path.resolve(process.cwd(), 'uploads/banners');
    fs.mkdirSync(uploadDir, { recursive: true });
    const ext = path.extname(file.originalname) || '.png';
    const filename = `banner-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    imageUrl = `${env.APP_URL}/uploads/banners/${filename}`;
  }

  sendSuccess(res, { url: imageUrl }, { message: 'Gambar banner berhasil diunggah.' });
}));

export default router;
