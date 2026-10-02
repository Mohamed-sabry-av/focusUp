import { describe, it, expect } from 'vitest';
import { generateUniqueUsername, usernameBaseFromEmail } from './username';

const VALID = /^[a-zA-Z0-9_-]{3,30}$/;

describe('usernameBaseFromEmail', () => {
  it('uses the part before the @', () => {
    expect(usernameBaseFromEmail('sara.test@example.com')).toBe('sara-test');
  });

  it('replaces characters that are not allowed in usernames', () => {
    expect(usernameBaseFromEmail('a+b.c@example.com')).toBe('a-b-c');
  });

  it('falls back to "user" when too little is left', () => {
    expect(usernameBaseFromEmail('+@example.com')).toBe('user');
    expect(usernameBaseFromEmail('ab@example.com')).toBe('user');
  });

  it('keeps long local parts within the base limit', () => {
    const base = usernameBaseFromEmail(`${'x'.repeat(60)}@example.com`);
    expect(base.length).toBeLessThanOrEqual(24);
  });
});

describe('generateUniqueUsername', () => {
  it('returns the plain base when it is free', async () => {
    const result = await generateUniqueUsername('sara@example.com', async () => false);
    expect(result).toBe('sara');
  });

  it('adds a numeric suffix when the base is taken', async () => {
    const taken = new Set(['sara']);
    const result = await generateUniqueUsername('sara@example.com', async (u) => taken.has(u));
    expect(result).toMatch(/^sara-\d{4}$/);
  });

  it('keeps trying until it finds a free name', async () => {
    let calls = 0;
    const result = await generateUniqueUsername('sara@example.com', async () => ++calls < 4);
    expect(calls).toBe(4);
    expect(result).toMatch(VALID);
  });

  it('always produces a valid username, even for long emails', async () => {
    const taken = new Set([usernameBaseFromEmail(`${'y'.repeat(60)}@example.com`)]);
    const result = await generateUniqueUsername(`${'y'.repeat(60)}@example.com`, async (u) =>
      taken.has(u),
    );
    expect(result).toMatch(VALID);
  });

  it('gives up with an error when nothing is free', async () => {
    await expect(generateUniqueUsername('sara@example.com', async () => true)).rejects.toThrow(
      'Could not generate a unique username',
    );
  });
});
