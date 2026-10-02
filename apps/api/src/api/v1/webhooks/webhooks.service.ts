import { WebhookReceiver, type WebhookEvent } from 'livekit-server-sdk';
import { env } from '@focusUp/env/server';

import { AppError } from '../../../utils/errors';
import { SessionPresenceService } from '../sessions/session-presence.service';

let receiver: WebhookReceiver | undefined;

function getReceiver(): WebhookReceiver {
  receiver ??= new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  return receiver;
}

export class WebhooksService {
  /**
   * Checks the LiveKit signature (and that the body matches it), then returns the event.
   * Anything that does not verify is rejected with 401 and changes nothing.
   */
  static async verifyLivekitEvent(rawBody: string, authorization: string | undefined): Promise<WebhookEvent> {
    if (!authorization) throw new AppError('Missing webhook signature', 401);
    try {
      return await getReceiver().receive(rawBody, authorization);
    } catch {
      throw new AppError('Invalid webhook signature', 401);
    }
  }

  /** Applies a verified LiveKit event. Unknown events are ignored on purpose. */
  static async handleLivekitEvent(event: WebhookEvent, now: Date = new Date()): Promise<void> {
    const roomName = event.room?.name;
    if (!roomName) return;

    switch (event.event) {
      case 'participant_joined':
      case 'participant_left': {
        const userId = event.participant?.identity;
        if (!userId) return;
        const connectedAt = connectionStart(event);
        const params = { roomName, userId, connectedAt, now };
        if (event.event === 'participant_joined') {
          await SessionPresenceService.recordJoin(params);
        } else {
          await SessionPresenceService.recordLeave(params);
        }
        return;
      }
      case 'room_finished':
        await SessionPresenceService.recordRoomFinished({ roomName, now });
        return;
      default:
        return;
    }
  }
}

/** When this connection started, so a late "left" of an old connection can be told apart. */
function connectionStart(event: WebhookEvent): Date {
  const participant = event.participant;
  const ms = participant?.joinedAtMs ? Number(participant.joinedAtMs) : 0;
  if (ms > 0) return new Date(ms);
  const seconds = participant?.joinedAt ? Number(participant.joinedAt) : 0;
  if (seconds > 0) return new Date(seconds * 1000);
  // No timestamp: treat the event time as the connection time.
  return event.createdAt ? new Date(Number(event.createdAt) * 1000) : new Date();
}
