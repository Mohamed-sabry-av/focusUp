import { sendToUser } from "../lib/socket";
import { EmailService } from "./email.service";

interface BaseUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  timezone: string;
}

interface MatchSession {
  id: string;
  scheduledAt: Date;
  durationMin: number;
  user1: BaseUser;
  user2: BaseUser | null;
}

interface ReminderSession {
  id: string;
  user1Id: string;
  user2Id: string | null;
  scheduledAt: Date;
}

interface NoShowSession {
  id: string;
}

export class NotificationService {
  static async notifyMatch(session: MatchSession): Promise<void> {
    const { user1, user2 } = session;

    if (!user2) {
      console.error(
        `[NotificationService] notifyMatch called with null user2 for session ${session.id}`,
      );
      return;
    }

    // Notify user1 (partner = user2)
    await sendToUser(user1.id, "match:found", {
      sessionId: session.id,
      partnerName: user2.displayName,
      partnerAvatar: user2.avatarUrl,
      scheduledAt: session.scheduledAt,
      durationMin: session.durationMin,
      joinUrl: `/session/${session.id}`,
    });

    // Notify user2 (partner = user1)
    await sendToUser(user2.id, "match:found", {
      sessionId: session.id,
      partnerName: user1.displayName,
      partnerAvatar: user1.avatarUrl,
      scheduledAt: session.scheduledAt,
      durationMin: session.durationMin,
      joinUrl: `/session/${session.id}`,
    });

    // Send emails (async, fire and forget)
    EmailService.sendBookingConfirmation({
      to: user1.email,
      partnerName: user2.displayName,
      sessionTime: session.scheduledAt,
      durationMin: session.durationMin,
      sessionId: session.id,
      timezone: user1.timezone,
    }).catch((err) => console.error("Email error:", err));

    EmailService.sendBookingConfirmation({
      to: user2.email,
      partnerName: user1.displayName,
      sessionTime: session.scheduledAt,
      durationMin: session.durationMin,
      sessionId: session.id,
      timezone: user2.timezone,
    }).catch((err) => console.error("Email error:", err));
  }

  static async notifySessionReminder(
    session: ReminderSession,
    type: "24h" | "5min",
  ): Promise<void> {
    const event =
      type === "5min" ? "session:reminder-urgent" : "session:reminder";

    await sendToUser(session.user1Id, event, {
      sessionId: session.id,
      type,
      scheduledAt: session.scheduledAt,
      joinUrl: `/session/${session.id}`,
    });

    if (session.user2Id) {
      await sendToUser(session.user2Id, event, {
        sessionId: session.id,
        type,
        scheduledAt: session.scheduledAt,
        joinUrl: `/session/${session.id}`,
      });
    }
  }

  static async notifyNoShow(
    session: NoShowSession,
    presentUserId: string,
  ): Promise<void> {
    await sendToUser(presentUserId, "session:noshow", {
      sessionId: session.id,
      message: "Your partner did not join the session.",
    });
  }

  /** Two people whose partners did not come were paired: the browser moves to the new room. */
  static async notifyRematch(userId: string, newSessionId: string): Promise<void> {
    await sendToUser(userId, "session:rematched", {
      sessionId: newSessionId,
      joinUrl: `/session/${newSessionId}`,
      message: "We found you a new partner.",
    });
  }

  static async notifyBookingExpired(
    userId: string,
    slotTime: Date,
  ): Promise<void> {
    await sendToUser(userId, "booking:expired", {
      slotTime,
      message: "No partner was found for your session.",
    });
  }
}
