import { Request, Response, NextFunction } from 'express';
import * as roomService from './room.service';
import { sendSuccess, sendError } from '../../utils/response';

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res, next); } catch (err: any) {
      if (err.code) sendError(res, err.code, err.message, err.status ?? 400);
      else next(err);
    }
  };

export const list = handle(async (req, res) => {
  const propertyId = req.params.propertyId || (req.query.propertyId as string | undefined);
  const result = await roomService.listRooms(req.user!.sub, propertyId, req.query as any);
  sendSuccess(res, result.data, { meta: result.meta });
});

export const create = handle(async (req, res) => {
  const propertyId = req.params.propertyId || req.body.propertyId;
  if (!propertyId) {
    sendError(res, 'MISSING_PROPERTY_ID', 'ID Properti wajib disertakan.', 400);
    return;
  }
  const result = await roomService.createRoom(req.user!.sub, propertyId, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { statusCode: 201 });
});

export const getById = handle(async (req, res) => {
  const result = await roomService.getRoomById(req.user!.sub, req.params.propertyId, req.params.id);
  sendSuccess(res, result);
});

export const update = handle(async (req, res) => {
  const result = await roomService.updateRoom(req.user!.sub, req.params.propertyId, req.params.id, req.body, req.ip, req.headers['user-agent']);
  sendSuccess(res, result, { message: 'Kamar berhasil diperbarui.' });
});

export const remove = handle(async (req, res) => {
  await roomService.deleteRoom(req.user!.sub, req.params.propertyId, req.params.id, req.ip, req.headers['user-agent']);
  sendSuccess(res, null, { message: 'Kamar berhasil dihapus.' });
});

export const uploadPhotos = handle(async (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    sendError(res, 'NO_FILES', 'Tidak ada file yang diupload.', 400);
    return;
  }
  const result = await roomService.uploadRoomPhotos(req.user!.sub, req.params.propertyId, req.params.id, req.files as Express.Multer.File[]);
  sendSuccess(res, result, { statusCode: 201 });
});
