import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * Validates req.body, req.query, or req.params against a Zod schema.
 */
export const validate = (schema: ZodSchema, part: RequestPart = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);
      // Replace with parsed (coerced) values
      if (part === 'body') req.body = parsed;
      else if (part === 'query') req.query = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendError(
          res,
          'VALIDATION_ERROR',
          'Data yang dikirimkan tidak valid.',
          422,
          details
        );
      } else {
        next(err);
      }
    }
  };
};
