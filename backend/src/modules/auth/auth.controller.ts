import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';

const getClientInfo = (req: Request) => ({
  ip: req.ip || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
});

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ip, userAgent } = getClientInfo(req);
    const result = await authService.registerOwner(req.body, ip, userAgent);
    sendSuccess(res, result, { statusCode: 201, message: 'Registrasi berhasil. Selamat datang di KostKita!' });
  } catch (err: any) {
    if (err.code) {
      sendError(res, err.code, err.message, err.status ?? 400);
    } else {
      next(err);
    }
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ip, userAgent } = getClientInfo(req);
    const result = await authService.loginUser(req.body, ip, userAgent);
    sendSuccess(res, result, { message: 'Login berhasil.' });
  } catch (err: any) {
    if (err.code) {
      sendError(res, err.code, err.message, err.status ?? 400);
    } else {
      next(err);
    }
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ip, userAgent } = getClientInfo(req);
    const { credential } = req.body;
    if (!credential) {
      sendError(res, 'MISSING_CREDENTIAL', 'Google credential wajib dikirimkan.', 400);
      return;
    }
    const result = await authService.googleAuth(credential, ip, userAgent);
    sendSuccess(res, result, {
      statusCode: result.isNewUser ? 201 : 200,
      message: result.isNewUser ? 'Pendaftaran dengan Google berhasil!' : 'Login dengan Google berhasil!',
    });
  } catch (err: any) {
    if (err.code) {
      sendError(res, err.code, err.message, err.status ?? 400);
    } else {
      next(err);
    }
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.getMe(req.user!.sub);
    sendSuccess(res, result);
  } catch (err: any) {
    if (err.code) {
      sendError(res, err.code, err.message, err.status ?? 400);
    } else {
      next(err);
    }
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.updateProfile(req.user!.sub, req.body);
    sendSuccess(res, result, { message: 'Profil berhasil diperbarui.' });
  } catch (err: any) {
    if (err.code) {
      sendError(res, err.code, err.message, err.status ?? 400);
    } else {
      next(err);
    }
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.changePassword(req.user!.sub, req.body);
    sendSuccess(res, null, { message: 'Password berhasil diubah.' });
  } catch (err: any) {
    if (err.code) {
      sendError(res, err.code, err.message, err.status ?? 400);
    } else {
      next(err);
    }
  }
};
