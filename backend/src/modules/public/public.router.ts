import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import * as publicService from './public.service';
import { sendSuccess, sendError } from '../../utils/response';

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
  sendSuccess(res, result.data, { meta: result.meta });
}));

router.get('/properties/:slug', handle(async (req, res) => {
  const q = req.query as any;
  const result = await publicService.getPublicPropertyDetail(
    req.params.slug,
    q.lat ? parseFloat(q.lat) : undefined,
    q.lng ? parseFloat(q.lng) : undefined
  );
  sendSuccess(res, result);
}));

router.post('/listing-reports', handle(async (req, res) => {
  const result = await publicService.submitListingReport(req.body);
  sendSuccess(res, result, { statusCode: 201, message: 'Laporan berhasil dikirim. Terima kasih.' });
}));

export default router;
