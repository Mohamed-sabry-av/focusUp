import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.user) return next(new AppError("Not authenticated", 401));
  if (!req.user.isAdmin) return next(new AppError("Admin access required", 403));
  next();
};
