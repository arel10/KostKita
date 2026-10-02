import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../types/express.d';
import { sendError } from '../utils/response';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'Token autentikasi tidak ditemukan.', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    // Check if user is suspended
    if (payload.status === 'suspended') {
      sendError(
        res,
        'OWNER_SUSPENDED',
        'Akun Anda telah disuspend. Hubungi administrator untuk informasi lebih lanjut.',
        403
      );
      return;
    }

    if (payload.status === 'deactivated') {
      sendError(res, 'ACCOUNT_DEACTIVATED', 'Akun Anda telah dinonaktifkan.', 403);
      return;
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, 'TOKEN_EXPIRED', 'Sesi Anda telah berakhir. Silakan login kembali.', 401);
    } else {
      sendError(res, 'INVALID_TOKEN', 'Token tidak valid.', 401);
    }
  }
};
