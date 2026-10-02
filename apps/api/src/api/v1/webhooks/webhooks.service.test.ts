import { createHash } from 'node:crypto';

import { AccessToken } from 'livekit-server-sdk';
import { describe, expect, it } from 'vitest';

import { AppError } from '../../../utils/errors';
import { WebhooksService } from './webhooks.service';

const KEY = 'testkey';
const SECRET = 'test-livekit-secret-test-livekit-secret';

/** What LiveKit does: a JWT signed with the API secret that carries the body's sha256. */
async function sign(body: string, secret = SECRET): Promise<string> {
  const token = new AccessToken(KEY, secret);
  token.sha256 = createHash('sha256').update(body).digest('base64');
  return token.toJwt();
}

const body = JSON.stringify({
  event: 'participant_joined',
  room: { name: 'room-1' },
  participant: { identity: 'user-1', joinedAt: '1790000000' },
  createdAt: '1790000000',
  id: 'EV_test',
});

describe('WebhooksService.verifyLivekitEvent', () => {
  it('accepts a correctly signed body and returns the event', async () => {
    const event = await WebhooksService.verifyLivekitEvent(body, await sign(body));
    expect(event.event).toBe('participant_joined');
    expect(event.room?.name).toBe('room-1');
    expect(event.participant?.identity).toBe('user-1');
  });

  it('rejects a request without a signature', async () => {
    await expect(WebhooksService.verifyLivekitEvent(body, undefined)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a signature made with another secret', async () => {
    const forged = await sign(body, 'another-secret-another-secret-another-secret');
    await expect(WebhooksService.verifyLivekitEvent(body, forged)).rejects.toBeInstanceOf(AppError);
  });

  it('rejects a body that was changed after it was signed', async () => {
    const signature = await sign(body);
    const tampered = body.replace('user-1', 'user-2');
    await expect(WebhooksService.verifyLivekitEvent(tampered, signature)).rejects.toMatchObject({ statusCode: 401 });
  });
});
