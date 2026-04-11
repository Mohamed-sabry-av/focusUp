import type{  Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';
import { AppError } from '../utils/errors';

export const validate = (schema: ZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      if (error && error.name === 'ZodError') {
        const issues = error.errors || error.issues || [];
        next(new AppError(issues.map((e: any) => e.message).join(', '), 400, issues));
      } else {
        next(error);
      }
    }
  };
};
