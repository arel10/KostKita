import { Request, Response, NextFunction } from 'express';
import * as subService from './subscription.service';
import { sendSuccess, sendError } from '../../utils/response';

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err: any) {
      if (err.code) sendError(res, err.code, err.message, err.status ?? 400);
      else next(err);
    }
  };

// ── Owner ─────────────────────────────────────

export const getCurrent = handle(async (req, res) => {
  const result = await subService.getCurrentSubscription(req.user!.sub);
  sendSuccess(res, result);
});

export const getHistory = handle(async (req, res) => {
  const result = await subService.getSubscriptionHistory(req.user!.sub, req.query);
  sendSuccess(res, result.data, { meta: result.meta });
});

export const getPlans = handle(async (req, res) => {
  const result = await subService.getAvailablePlans();
  sendSuccess(res, result);
});

export const getPaymentMethods = handle(async (_req, res) => {
  const result = await subService.getPaymentMethods();
  sendSuccess(res, result);
});

export const submitProof = handle(async (req, res) => {
  const result = await subService.submitPaymentProof(
    req.user!.sub,
    req.body,
    req.file,
    req.ip,
    req.headers['user-agent']
  );
  sendSuccess(res, result, { statusCode: 201, message: 'Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.' });
});

export const getMyPayments = handle(async (req, res) => {
  const result = await subService.getOwnerPaymentHistory(req.user!.sub, req.query);
  sendSuccess(res, result.data, { meta: result.meta });
});

// ── Admin ─────────────────────────────────────

export const adminListPayments = handle(async (req, res) => {
  const result = await subService.adminListPayments(req.query);
  sendSuccess(res, result.data, { meta: result.meta });
});

export const adminApprove = handle(async (req, res) => {
  await subService.approvePayment(req.user!.sub, req.params.id, req.ip, req.headers['user-agent']);
  sendSuccess(res, null, { message: 'Pembayaran berhasil disetujui.' });
});

export const adminReject = handle(async (req, res) => {
  await subService.rejectPayment(req.user!.sub, req.params.id, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, null, { message: 'Pembayaran telah ditolak.' });
});
