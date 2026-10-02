import { AccessToken } from 'livekit-server-sdk';
import { SessionStatus, type SessionRoomResponse, type SessionTokenResponse } from '@focusUp/shared-types';
import { env } from '@focusUp/env/server';

import { buildRoomGrant } from '../../../lib/livekit-grants';
import { prisma } from '../../../lib/prisma';
import {
  computePhase,
  joinOpensAt,
  MAX_EXTENSIONS,
  nextExtension,
  personalEnd,
  sessionEnd,
} from '../../../lib/session-phase';
import { AppError } from '../../../utils/errors';

const MINUTE = 60 * 1000;
/** "Keep going" is offered during the last minutes and for a short while after the end. */
const EXTEND_WINDOW_BEFORE_MIN = 5;
const EXTEND_WINDOW_AFTER_MIN = 2;
/** People may reconnect for a few minutes after the end (check-out). */
const REJOIN_GRACE_MIN = 5;
/** A token is valid for 2 hours (AGENTS.md). */
const TOKEN_TTL_SECONDS = 2 * 60 * 60;

async function loadSession(sessionId: string, userId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user1: { select: { id: true, displayName: true, avatarUrl: true, hidePhoto: true } },
      user2: { select: { id: true, displayName: true, avatarUrl: true, hidePhoto: true } },
      participants: true,
    },
  });
  if (!session) throw new AppError('Session not found', 404);
  if (session.user1Id !== userId && session.user2Id !== userId) {
    throw new AppError('You are not a participant in this session', 403);
  }
  return session;
}

type LoadedSession = Awaited<ReturnType<typeof loadSession>>;

/** Who chose Quiet mode for this session. It is stored on each person's booking. */
async function quietByUser(sessionId: string): Promise<Map<string, boolean>> {
  const bookings = await prisma.bookingRequest.findMany({
    where: { sessionId },
    select: { userId: true, quiet: true },
  });
  return new Map(bookings.map((b) => [b.userId, b.quiet]));
}

function phaseFor(session: LoadedSession, userId: string, now: Date) {
  const me = session.participants.find((p) => p.userId === userId);
  const partnerId = session.user1Id === userId ? session.user2Id : session.user1Id;
  const partnerRow = session.participants.find((p) => p.userId === partnerId);
  const extendedUntil = me?.extendedUntil ?? null;

  const phase = session.rematchedToId
    ? ('ENDED' as const)
    : computePhase({
        status: session.status,
        isSolo: session.isSolo,
        scheduledAt: session.scheduledAt,
        durationMin: session.durationMin,
        now,
        partnerHasJoined: Boolean(partnerRow?.firstJoinedAt),
        extendedUntil,
      });

  return { phase, me, partnerId, partnerRow, extendedUntil };
}

export class SessionRoomService {
  /** Everything the room screen needs, computed on the server. */
  static async getRoom(sessionId: string, userId: string, now: Date = new Date()): Promise<SessionRoomResponse> {
    const session = await loadSession(sessionId, userId);
    const quiet = await quietByUser(sessionId);
    const { phase, me, partnerId, partnerRow, extendedUntil } = phaseFor(session, userId, now);

    const isUser1 = session.user1Id === userId;
    const meUser = isUser1 ? session.user1 : session.user2;
    const partnerUser = isUser1 ? session.user2 : session.user1;
    if (!meUser) throw new AppError('Session not found', 404);

    const endsAt = personalEnd(session.scheduledAt, session.durationMin, extendedUntil);
    const extensionCount = me?.extensionCount ?? 0;

    const canExtend =
      Boolean(me) &&
      extensionCount < MAX_EXTENSIONS &&
      !session.endedEarly &&
      !session.rematchedToId &&
      (session.status === 'ACTIVE' || session.status === 'COMPLETED') &&
      now.getTime() >= endsAt.getTime() - EXTEND_WINDOW_BEFORE_MIN * MINUTE &&
      now.getTime() < endsAt.getTime() + EXTEND_WINDOW_AFTER_MIN * MINUTE;

    return {
      id: session.id,
      status: SessionStatus[session.status],
      phase,
      isSolo: session.isSolo,
      durationMin: session.durationMin,
      scheduledAt: session.scheduledAt.toISOString(),
      endsAt: endsAt.toISOString(),
      joinOpensAt: joinOpensAt(session.scheduledAt).toISOString(),
      serverTime: now.toISOString(),
      me: {
        id: meUser.id,
        displayName: meUser.displayName,
        avatarUrl: meUser.avatarUrl,
        quiet: quiet.get(userId) ?? false,
        isPresent: me?.isPresent ?? false,
        goal: isUser1 ? session.user1Goal : session.user2Goal,
        extensionsLeft: MAX_EXTENSIONS - extensionCount,
      },
      partner: partnerUser
        ? {
            id: partnerUser.id,
            displayName: partnerUser.displayName,
            // The API never sends the photo of someone who hides it.
            avatarUrl: partnerUser.hidePhoto ? null : partnerUser.avatarUrl,
            quiet: partnerId ? (quiet.get(partnerId) ?? false) : false,
            isPresent: partnerRow?.isPresent ?? false,
          }
        : null,
      partnerGoal: isUser1 ? session.user2Goal : session.user1Goal,
      rematchedToSessionId: session.rematchedToId,
      canExtend,
    };
  }

  /**
   * A LiveKit token for the room. The server decides what the person may publish:
   * in Quiet mode the microphone is refused, whatever the browser does.
   */
  static async issueToken(sessionId: string, userId: string, now: Date = new Date()): Promise<SessionTokenResponse> {
    const session = await loadSession(sessionId, userId);
    if (session.rematchedToId) {
      throw new AppError('You were paired with someone else for this time slot', 409);
    }

    const { phase, extendedUntil } = phaseFor(session, userId, now);
    if (phase === 'UPCOMING') {
      throw new AppError('The room opens 5 minutes before the session starts', 403);
    }
    const end = personalEnd(session.scheduledAt, session.durationMin, extendedUntil);
    const checkOutOpen = phase === 'CHECK_OUT' && now.getTime() < end.getTime() + REJOIN_GRACE_MIN * MINUTE;
    if (phase === 'ENDED' || (phase === 'CHECK_OUT' && !checkOutOpen)) {
      throw new AppError('This session has ended', 403);
    }

    const quiet = (await quietByUser(sessionId)).get(userId) ?? false;
    const user = session.user1Id === userId ? session.user1 : session.user2;

    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: userId,
      name: user?.displayName ?? 'Guest',
      // Only what the other person's screen needs. Never an email.
      metadata: JSON.stringify({ quiet }),
      ttl: TOKEN_TTL_SECONDS,
    });
    token.addGrant(buildRoomGrant({ roomName: session.livekitRoomName, quiet }));

    return { token: await token.toJwt() };
  }

  /** "Keep going 15 minutes", for this person only. It never counts toward quota or strikes. */
  static async extend(sessionId: string, userId: string, now: Date = new Date()): Promise<SessionRoomResponse> {
    const room = await this.getRoom(sessionId, userId, now);
    if (!room.canExtend) {
      throw new AppError('You can keep going only near the end of your session, up to twice', 400);
    }

    const session = await loadSession(sessionId, userId);
    const me = session.participants.find((p) => p.userId === userId);
    if (!me) throw new AppError('Join the room first', 400);

    const next = nextExtension({
      scheduledAt: session.scheduledAt,
      durationMin: session.durationMin,
      extendedUntil: me.extendedUntil,
      extensionCount: me.extensionCount,
    });
    if (!next) throw new AppError('You have used all your extensions', 400);

    // The count in the filter makes a double click count once.
    const updated = await prisma.sessionParticipant.updateMany({
      where: { id: me.id, extensionCount: me.extensionCount },
      data: { extendedUntil: next, extensionCount: { increment: 1 } },
    });
    if (updated.count === 0) throw new AppError('Your request is already being processed, try again', 409);

    return this.getRoom(sessionId, userId, now);
  }

  /** Continue alone when the partner is late. No strike for this person and no quota use. */
  static async acceptSolo(sessionId: string, userId: string, now: Date = new Date()): Promise<SessionRoomResponse> {
    const session = await loadSession(sessionId, userId);
    const { phase, me } = phaseFor(session, userId, now);

    if (session.isSolo) return this.getRoom(sessionId, userId, now);
    if (!me?.isPresent) throw new AppError('Join the room first', 400);
    if (phase !== 'SOLO_OFFER' && phase !== 'PARTNER_ABSENT') {
      throw new AppError('Solo mode is offered when your partner is 3 minutes late', 400);
    }

    await prisma.session.updateMany({
      where: { id: sessionId, status: 'CONFIRMED', isSolo: false },
      data: { isSolo: true, status: 'ACTIVE', startedAt: now },
    });
    return this.getRoom(sessionId, userId, now);
  }

  /**
   * Ends the session once its time is up. Leaving early does not end it for the partner:
   * the room closing is recorded from LiveKit's webhook instead.
   */
  static async complete(sessionId: string, userId: string, now: Date = new Date()) {
    const session = await loadSession(sessionId, userId);
    if (session.status === 'COMPLETED') return session;

    if (session.status !== 'ACTIVE') {
      throw new AppError('Only an active session can be completed', 400);
    }
    const end = sessionEnd(session.scheduledAt, session.durationMin);
    if (now.getTime() < end.getTime() - MINUTE) {
      throw new AppError('The session is still running', 400);
    }

    await prisma.session.updateMany({
      where: { id: sessionId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', endedAt: now },
    });
    return prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  }
}
