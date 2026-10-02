import { Request, Response, NextFunction } from 'express';
import * as paymentService from './payment.service';
import { sendSuccess, sendError } from '../../utils/response';

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err: any) {
      if (err.code) sendError(res, err.code, err.message, err.status ?? 400);
      else next(err);
    }
  };

export const list = handle(async (req, res) => {
  const result = await paymentService.listPayments(req.user!.sub, req.query as any);
  sendSuccess(res, result.data, { meta: result.meta });
});

export const create = handle(async (req, res) => {
  const result = await paymentService.createPayment(req.user!.sub, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { statusCode: 201 });
});

export const getById = handle(async (req, res) => {
  const result = await paymentService.getPaymentById(req.user!.sub, req.params.id);
  sendSuccess(res, result);
});

export const update = handle(async (req, res) => {
  const result = await paymentService.updatePayment(req.user!.sub, req.params.id, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { message: 'Pembayaran berhasil diperbarui.' });
});

export const remove = handle(async (req, res) => {
  await paymentService.deletePayment(req.user!.sub, req.params.id);
  sendSuccess(res, null, { message: 'Pembayaran berhasil dihapus.' });
});
