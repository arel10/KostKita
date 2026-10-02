import { UserRole, UserStatus } from '@prisma/client';
import { Request } from 'express';

export interface AuthPayload {
  sub: string;
  role: UserRole;
  status: UserStatus;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export {};
