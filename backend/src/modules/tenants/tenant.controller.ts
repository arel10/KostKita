import { Request, Response, NextFunction } from 'express';
import * as tenantService from './tenant.service';
import { sendSuccess, sendError } from '../../utils/response';

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err: any) {
      if (err.code) sendError(res, err.code, err.message, err.status ?? 400);
      else next(err);
    }
  };

export const list = handle(async (req, res) => {
  const result = await tenantService.listTenants(req.user!.sub, req.query as any);
  sendSuccess(res, result.data, { meta: result.meta });
});

export const create = handle(async (req, res) => {
  const result = await tenantService.createTenant(req.user!.sub, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { statusCode: 201 });
});

export const getById = handle(async (req, res) => {
  const result = await tenantService.getTenantById(req.user!.sub, req.params.id);
  sendSuccess(res, result);
});

export const update = handle(async (req, res) => {
  const result = await tenantService.updateTenant(req.user!.sub, req.params.id, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { message: 'Data penghuni berhasil diperbarui.' });
});

export const addStay = handle(async (req, res) => {
  const result = await tenantService.createStay(req.user!.sub, req.params.id, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { statusCode: 201, message: 'Check-in berhasil.' });
});

export const endStay = handle(async (req, res) => {
  await tenantService.endStay(req.user!.sub, req.params.id, req.params.stayId, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, null, { message: 'Check-out berhasil.' });
});

export const remove = handle(async (req, res) => {
  await tenantService.deleteTenant(req.user!.sub, req.params.id, req.ip, req.headers['user-agent']);
  sendSuccess(res, null, { message: 'Data penghuni berhasil dihapus.' });
});
