import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendError } from '../utils/response';

/**
 * Role-based authorization middleware.
 * Call after authenticate middleware.
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Autentikasi diperlukan.', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN', 'Anda tidak memiliki izin untuk mengakses resource ini.', 403);
      return;
    }

    next();
  };
};

/** Shorthand: only super admin */
export const superAdminOnly = authorize('super_admin');

/** Shorthand: only owner */
export const ownerOnly = authorize('owner');

/** Shorthand: both roles */
export const authenticated = authorize('super_admin', 'owner');
