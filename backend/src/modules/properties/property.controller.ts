import { Request, Response, NextFunction } from 'express';
import * as propertyService from './property.service';
import { sendSuccess, sendError } from '../../utils/response';

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (err: any) {
      if (err.code) sendError(res, err.code, err.message, err.status ?? 400);
      else next(err);
    }
  };

export const list = handle(async (req, res) => {
  const result = await propertyService.listProperties(req.user!.sub, req.query as any);
  sendSuccess(res, result.data, { meta: result.meta });
});

export const create = handle(async (req, res) => {
  const result = await propertyService.createProperty(req.user!.sub, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { statusCode: 201 });
});

export const getById = handle(async (req, res) => {
  const result = await propertyService.getPropertyById(req.user!.sub, req.params.id);
  sendSuccess(res, result);
});

export const update = handle(async (req, res) => {
  const result = await propertyService.updateProperty(req.user!.sub, req.params.id, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { message: 'Properti berhasil diperbarui.' });
});

export const publish = handle(async (req, res) => {
  const result = await propertyService.publishProperty(req.user!.sub, req.params.id, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { message: 'Properti berhasil dipublish.' });
});

export const unpublish = handle(async (req, res) => {
  const result = await propertyService.unpublishProperty(req.user!.sub, req.params.id, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { message: 'Properti berhasil di-unpublish.' });
});

export const remove = handle(async (req, res) => {
  await propertyService.deleteProperty(req.user!.sub, req.params.id, req.ip, req.headers['user-agent']);
  sendSuccess(res, null, { message: 'Properti berhasil dihapus.' });
});

export const uploadPhotos = handle(async (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    sendError(res, 'NO_FILES', 'Tidak ada file yang diupload.', 400);
    return;
  }
  const result = await propertyService.uploadPropertyPhotos(req.user!.sub, req.params.id, req.files as Express.Multer.File[]);
  sendSuccess(res, result, { statusCode: 201, message: 'Foto berhasil diupload.' });
});

export const deletePhoto = handle(async (req, res) => {
  await propertyService.deletePropertyPhoto(req.user!.sub, req.params.id, req.params.photoId);
  sendSuccess(res, null, { message: 'Foto berhasil dihapus.' });
});
