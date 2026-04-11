import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const requireVerified = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }
  if (!req.user.emailVerified) {
    return next(new AppError('Please verify your email first', 403));
  }
  next();
};
