import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { sendSuccess } from '../../utils/response';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';

const router = Router();
router.use(authenticate, authorize('owner'));

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err) { next(err); }
  };

router.get('/', handle(async (req, res) => {
  const ownerId = req.user!.sub;
  const { page, perPage, skip } = getPaginationParams(req.query as any);

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId: ownerId } }),
    prisma.notification.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  sendSuccess(res, notifications, { meta: buildPaginationMeta(total, page, perPage) });
}));

router.get('/unread-count', handle(async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.sub, readAt: null },
  });
  sendSuccess(res, { count });
}));

router.patch('/:id/read', handle(async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.sub },
    data: { readAt: new Date() },
  });
  sendSuccess(res, null, { message: 'Notifikasi ditandai sudah dibaca.' });
}));

router.patch('/read-all', handle(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.sub, readAt: null },
    data: { readAt: new Date() },
  });
  sendSuccess(res, null, { message: 'Semua notifikasi ditandai sudah dibaca.' });
}));

export default router;
