import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { AppError } from '../utils/errors';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        planTier: string;
        isActive: boolean;
        isBanned: boolean;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      throw new AppError('Missing access token', 401);
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      planTier: user.planTier,
      isActive: user.isActive,
      isBanned: user.isBanned,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
      next(new AppError('Invalid or expired access token', 401));
    } else {
      next(error);
    }
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }
  if (req.user.isBanned) {
    return next(new AppError('Account suspended', 403));
  }
  if (!req.user.isActive) {
    return next(new AppError('Account deactivated', 403));
  }
  next();
};
