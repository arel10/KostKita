import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../types/express.d';
import { sendError } from '../utils/response';
import { isTokenBlacklisted, isUserBlacklisted } from '../config/redis';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'Token autentikasi tidak ditemukan.', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check if token has been revoked in Redis
    if (await isTokenBlacklisted(token)) {
      sendError(res, 'TOKEN_REVOKED', 'Sesi Anda telah dicabut. Silakan login kembali.', 401);
      return;
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    // Check if user is actively suspended in Redis (instant revoke across all devices)
    if (await isUserBlacklisted(payload.sub)) {
      sendError(
        res,
        'OWNER_SUSPENDED',
        'Akun Anda telah disuspend. Hubungi administrator untuk informasi lebih lanjut.',
        403
      );
      return;
    }

    // Check if user is suspended in JWT payload
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
