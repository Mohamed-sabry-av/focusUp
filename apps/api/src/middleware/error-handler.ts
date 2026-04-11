import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
      details: err.details,
    });
    return;
  }

  const e: Error & { code?: string } =
    err instanceof Error
      ? (err as Error & { code?: string })
      : new Error(
          typeof err === 'string' ? err : JSON.stringify(err),
        );

  console.error(e);

  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
  });
};
