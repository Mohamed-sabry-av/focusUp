import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../utils/errors';
import { isSerializationFailure, withSerializableRetry } from './transactions';

function driverConflict(): Error {
  const error = new Error('TransactionWriteConflict');
  error.name = 'DriverAdapterError';
  Object.assign(error, { cause: { kind: 'TransactionWriteConflict', originalCode: '40001' } });
  return error;
}

function p2034(): Error {
  return new Prisma.PrismaClientKnownRequestError('Transaction failed due to a write conflict', {
    code: 'P2034',
    clientVersion: 'test',
  });
}

describe('isSerializationFailure', () => {
  it('recognizes the driver adapter error the pg adapter really throws', () => {
    expect(isSerializationFailure(driverConflict())).toBe(true);
  });

  it('recognizes the Prisma P2034 error', () => {
    expect(isSerializationFailure(p2034())).toBe(true);
  });

  it('recognizes Postgres code 40001 even when the kind is missing', () => {
    const error = new Error('x');
    error.name = 'DriverAdapterError';
    Object.assign(error, { cause: { originalCode: '40001' } });
    expect(isSerializationFailure(error)).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isSerializationFailure(new Error('boom'))).toBe(false);
    expect(isSerializationFailure(new AppError('nope', 400))).toBe(false);
    expect(isSerializationFailure(null)).toBe(false);
    expect(isSerializationFailure('P2034')).toBe(false);
    const otherDriverError = new Error('x');
    otherDriverError.name = 'DriverAdapterError';
    Object.assign(otherDriverError, { cause: { kind: 'UniqueConstraintViolation' } });
    expect(isSerializationFailure(otherDriverError)).toBe(false);
  });
});

describe('withSerializableRetry', () => {
  it('returns the result straight away when nothing conflicts', async () => {
    const run = vi.fn().mockResolvedValue('ok');
    expect(await withSerializableRetry(run)).toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries a conflict and then succeeds', async () => {
    const run = vi.fn().mockRejectedValueOnce(driverConflict()).mockResolvedValue('ok');
    expect(await withSerializableRetry(run)).toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('gives up with a clear 409 after 3 attempts', async () => {
    const run = vi.fn().mockRejectedValue(driverConflict());
    await expect(withSerializableRetry(run)).rejects.toMatchObject({ statusCode: 409 });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does not retry other errors', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withSerializableRetry(run)).rejects.toThrow('boom');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
