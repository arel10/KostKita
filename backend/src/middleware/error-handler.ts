import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 'DUPLICATE_ENTRY', 'Data dengan nilai tersebut sudah ada.', 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
      return;
    }
  }

  // Zod validation
  if (err instanceof ZodError) {
    sendError(res, 'VALIDATION_ERROR', 'Data tidak valid.', 422, err.errors);
    return;
  }

  // Multer errors
  if (err.message === 'INVALID_FILE_TYPE') {
    sendError(res, 'INVALID_FILE_TYPE', 'Tipe file tidak diizinkan.', 400);
    return;
  }

  if (err.message === 'File too large') {
    sendError(res, 'FILE_TOO_LARGE', 'Ukuran file terlalu besar.', 400);
    return;
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    sendError(res, 'CORS_ERROR', 'Origin tidak diizinkan oleh CORS policy.', 403);
    return;
  }

  // Default internal error
  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    'Terjadi kesalahan pada server. Silakan coba lagi.',
    500,
    process.env.NODE_ENV === 'development' ? { message: err.message, stack: err.stack } : undefined
  );
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} tidak ditemukan.`, 404);
};
