/**
 * Test helper that stands in for Better Auth's session lookup.
 *
 * Use it in a test file with:
 *
 *   vi.mock('../../../lib/auth', async () => (await import('../../../test/auth-mock')).authModuleMock);
 *
 * and send `.set('Cookie', [authCookie('user-1')])` to act as that user.
 */
export function authCookie(userId: string): string {
  return `test_user=${userId}`;
}

interface FakeSession {
  session: { id: string };
  user: { id: string };
}

async function getSession({
  headers,
}: {
  headers: Headers;
}): Promise<FakeSession | null> {
  const cookie = headers.get('cookie') ?? '';
  const match = /(?:^|;\s*)test_user=([^;]+)/.exec(cookie);
  if (!match || !match[1]) return null;
  return { session: { id: 'test-session' }, user: { id: match[1] } };
}

export const authModuleMock = {
  auth: { api: { getSession } },
};
