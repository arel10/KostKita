import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    message?: string;
    meta?: PaginationMeta;
  }
): Response => {
  return res.status(options?.statusCode ?? 200).json({
    success: true,
    data,
    ...(options?.message && { message: options.message }),
    ...(options?.meta && { meta: options.meta }),
  } as SuccessResponse<T>);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown
): Response => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  } as ErrorResponse);
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  perPage: number
): PaginationMeta => ({
  page,
  perPage,
  total,
  totalPages: Math.ceil(total / perPage),
});

export const getPaginationParams = (
  query: Record<string, unknown>
): { page: number; perPage: number; skip: number } => {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10));
  const perPage = Math.min(100, Math.max(1, parseInt(String(query.perPage ?? '10'), 10)));
  return { page, perPage, skip: (page - 1) * perPage };
};
