import { Prisma } from '@prisma/client';

import { AppError } from '../utils/errors';

const MAX_ATTEMPTS = 3;

/** Postgres aborts one of two conflicting serializable transactions: "write conflict or deadlock". */
function isSerializationFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
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
