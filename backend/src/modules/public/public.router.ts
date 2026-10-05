import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import * as publicService from './public.service';
import { sendSuccess, sendError } from '../../utils/response';
import { getCache, setCache } from '../../config/redis';

const router = Router();

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err: any) {
      if (err.code) sendError(res, err.code, err.message, err.status ?? 400);
      else next(err);
    }
  };

router.get('/properties', handle(async (req, res) => {
  const q = req.query as any;
  const cacheKey = `cache:public:properties:${JSON.stringify(q)}`;

  // Try Redis cache first
  const cached = await getCache<{ data: any; meta: any }>(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    sendSuccess(res, cached.data, { meta: cached.meta });
    return;
  }

  const result = await publicService.searchProperties({
    page: q.page ? parseInt(q.page) : undefined,
    perPage: q.perPage ? parseInt(q.perPage) : undefined,
    city: q.city,
    district: q.district,
    type: q.type,
    priceMin: q.priceMin ? parseFloat(q.priceMin) : undefined,
    priceMax: q.priceMax ? parseFloat(q.priceMax) : undefined,
    facilities: q.facilities ? (Array.isArray(q.facilities) ? q.facilities : [q.facilities]) : undefined,
    availableOnly: q.availableOnly === 'true',
    lat: q.lat ? parseFloat(q.lat) : undefined,
    lng: q.lng ? parseFloat(q.lng) : undefined,
    radius: q.radius ? parseFloat(q.radius) : undefined,
    search: q.search,
  });

  // Cache for 60 seconds
  await setCache(cacheKey, { data: result.data, meta: result.meta }, 60);

  res.setHeader('X-Cache', 'MISS');
  sendSuccess(res, result.data, { meta: result.meta });
}));

router.get('/properties/:slug', handle(async (req, res) => {
  const q = req.query as any;
  const cacheKey = `cache:public:property:${req.params.slug}:${q.lat || ''}:${q.lng || ''}`;

  const cached = await getCache<any>(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    sendSuccess(res, cached);
    return;
  }

  const result = await publicService.getPublicPropertyDetail(
    req.params.slug,
    q.lat ? parseFloat(q.lat) : undefined,
    q.lng ? parseFloat(q.lng) : undefined
  );

  // Cache for 60 seconds
  await setCache(cacheKey, result, 60);

  res.setHeader('X-Cache', 'MISS');
  sendSuccess(res, result);
}));

router.post('/listing-reports', handle(async (req, res) => {
  const result = await publicService.submitListingReport(req.body);
  sendSuccess(res, result, { statusCode: 201, message: 'Laporan berhasil dikirim. Terima kasih.' });
}));

router.get('/banners', handle(async (req, res) => {
  const { getStoredBanners } = await import('../../utils/banners');
  const allBanners = await getStoredBanners();
  const activeBanners = allBanners.filter((b) => b.isActive);
  sendSuccess(res, activeBanners);
}));

export default router;
