import { Prisma } from '@prisma/client';

import { AppError } from '../utils/errors';

const MAX_ATTEMPTS = 3;

interface DriverErrorLike {
  name?: unknown;
  cause?: { kind?: unknown; originalCode?: unknown } | null;
}

/**
 * Postgres aborts one of two conflicting serializable transactions ("could not
 * serialize access", code 40001). Prisma reports it in two shapes: P2034 from the
 * query engine, and a DriverAdapterError (kind TransactionWriteConflict) from the
 * pg driver adapter this project uses. Both mean "run it again".
 */
export function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return true;
  }
  if (typeof error === 'object' && error !== null) {
    const e = error as DriverErrorLike;
    if (e.name === 'DriverAdapterError') {
      return e.cause?.kind === 'TransactionWriteConflict' || e.cause?.originalCode === '40001';
    }
  }
  return false;
}

/**
 * Runs a serializable transaction, retrying a small fixed number of times when the
 * database aborts it because a concurrent transaction touched the same rows. After
 * that it gives up with a clear 409 instead of looping forever.
 */
export async function withSerializableRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      if (attempt >= MAX_ATTEMPTS) {
        throw new AppError('Too many people are booking right now. Please try again.', 409);
      }
    }
  }
}
