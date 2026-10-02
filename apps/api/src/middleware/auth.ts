import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

declare global {
  namespace Express {
    /** Populated by authMiddleware from the Better Auth session. */
    interface User {
      id: string;
      email: string;
      username: string;
      planTier: string;
      isActive: boolean;
      isBanned: boolean;
      emailVerified: boolean;
      isAdmin: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}

/**
 * Reads the Better Auth session cookie, then loads the user from the database.
 * The cookie cache is bypassed so that a revoked session (password reset, sign-out)
 * and a ban or deactivation all apply at once, not after the cache expires. We
 * already query the database on every request, so this costs one indexed lookup.
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableCookieCache: true },
    });
    if (!session) {
      throw new AppError("Not authenticated", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      throw new AppError("User not found", 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      planTier: user.planTier,
      isActive: user.isActive,
      isBanned: user.isBanned,
      emailVerified: user.emailVerified,
      isAdmin: user.isAdmin,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Not authenticated", 401));
  }
  if (req.user.isBanned) {
    return next(new AppError("Account suspended", 403));
  }
  if (!req.user.isActive) {
    return next(new AppError("Account deactivated", 403));
  }
  next();
};
