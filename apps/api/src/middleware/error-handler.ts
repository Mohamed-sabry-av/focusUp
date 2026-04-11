import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import { env } from '@focusUp/env/server';
import { AppError } from '../utils/errors';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEBUG_LOG_PATH = join(__dirname, '../../../../debug-6aa3c4.log');

export const errorHandler = (
  err: unknown,
  req: Request,
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

  const payload = {
    sessionId: '6aa3c4',
    hypothesisId: 'H5',
    location: 'error-handler.ts',
    message: 'non_app_error',
    data: {
      name: e?.constructor?.name,
      errName: e?.name,
      errMessage: e?.message,
      code: e?.code,
      path: req.path,
    },
    timestamp: Date.now(),
  };
  try {
    appendFileSync(DEBUG_LOG_PATH, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch {
    /* avoid throwing from error handler */
  }

  const exposeInternal =
    env.NODE_ENV !== 'production' ||
    process.env.EXPOSE_INTERNAL_ERRORS === '1' ||
    process.env.EXPOSE_INTERNAL_ERRORS === 'true';

  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
    ...(exposeInternal && {
      details: {
        message: e.message,
        name: e.constructor?.name,
        code: e.code,
      },
    }),
  });
};
