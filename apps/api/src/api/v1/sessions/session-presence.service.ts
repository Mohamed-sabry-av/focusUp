import { prisma } from '../../../lib/prisma';
import { sessionEnd } from '../../../lib/session-phase';

const MINUTE = 60 * 1000;

/**
 * Who is in the LiveKit room, written only from signature-verified LiveKit webhooks.
 * The browser is never asked whether someone is present.
 *
 * Every method is safe to run twice or out of order: LiveKit may redeliver an event, and a
 * "left" for an old connection can arrive after the "joined" of the new one.
 */
export class SessionPresenceService {
  private static async findParticipantSession(roomName: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { livekitRoomName: roomName },
      select: { id: true, user1Id: true, user2Id: true, scheduledAt: true, status: true },
    });
    if (!session) return null;
    if (session.user1Id !== userId && session.user2Id !== userId) return null;
    return session;
  }

  /** `connectedAt` is when this connection started; it identifies the connection. */
  static async recordJoin(params: { roomName: string; userId: string; connectedAt: Date; now: Date }): Promise<void> {
    const { roomName, userId, connectedAt, now } = params;
    const session = await this.findParticipantSession(roomName, userId);
    if (!session) return;

    await prisma.sessionParticipant.createMany({
      data: [{ sessionId: session.id, userId, firstJoinedAt: connectedAt, lastJoinedAt: connectedAt, isPresent: true }],
      skipDuplicates: true,
    });
    await prisma.sessionParticipant.updateMany({
      where: { sessionId: session.id, userId, firstJoinedAt: null },
      data: { firstJoinedAt: connectedAt },
    });
    // A newer connection wins over an older one that is reported late.
    await prisma.sessionParticipant.updateMany({
      where: {
        sessionId: session.id,
        userId,
        OR: [{ lastJoinedAt: null }, { lastJoinedAt: { lte: connectedAt } }],
      },
      data: { isPresent: true, lastJoinedAt: connectedAt },
    });

    await this.activateWhenBothHaveJoined(session.id, session.scheduledAt, now);
  }

  static async recordLeave(params: { roomName: string; userId: string; connectedAt: Date; now: Date }): Promise<void> {
    const { roomName, userId, connectedAt, now } = params;
    const session = await this.findParticipantSession(roomName, userId);
    if (!session) return;

    // Ignored when a newer connection of the same person has already joined.
    await prisma.sessionParticipant.updateMany({
      where: {
        sessionId: session.id,
        userId,
        OR: [{ lastJoinedAt: null }, { lastJoinedAt: { lte: connectedAt } }],
      },
      data: { isPresent: false, lastLeftAt: now },
    });
  }

  /** LiveKit closed the room (everyone left). The session ends only if its time is up. */
  static async recordRoomFinished(params: { roomName: string; now: Date }): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { livekitRoomName: params.roomName },
      select: { id: true, scheduledAt: true, durationMin: true },
    });
    if (!session) return;

    const end = sessionEnd(session.scheduledAt, session.durationMin);
    // A one-minute margin: people sometimes leave a few seconds before the end.
    if (params.now.getTime() < end.getTime() - MINUTE) return;

    await prisma.session.updateMany({
      where: { id: session.id, status: 'ACTIVE' },
      data: { status: 'COMPLETED', endedAt: params.now },
    });
  }

  /** CONFIRMED to ACTIVE once both people have been in the room. Atomic, so a retry is harmless. */
  private static async activateWhenBothHaveJoined(sessionId: string, scheduledAt: Date, now: Date): Promise<void> {
    const joined = await prisma.sessionParticipant.count({
      where: { sessionId, firstJoinedAt: { not: null } },
    });
    if (joined < 2) return;

    await prisma.session.updateMany({
      where: { id: sessionId, status: 'CONFIRMED' },
      data: { status: 'ACTIVE', startedAt: now > scheduledAt ? now : scheduledAt },
    });
    // The partner arrived after the person chose to work alone: it is a real session again.
    await prisma.session.updateMany({
      where: { id: sessionId, status: 'ACTIVE', isSolo: true },
      data: { isSolo: false },
    });
  }
}
