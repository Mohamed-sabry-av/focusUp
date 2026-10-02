import type { Request, Response, NextFunction } from 'express';
import type {
  CreateSessionTaskInput,
  ReportFromRoomInput,
  SetGoalInput,
  UpdateSessionTaskInput,
} from '@focusUp/shared-types';

import { AppError } from '../../../utils/errors';
import { SessionReportService } from './session-report.service';
import { SessionRoomService } from './session-room.service';
import { SessionTasksService } from './session-tasks.service';
import { SessionsService } from './sessions.service';

function currentUserId(req: Request): string {
  if (!req.user) throw new AppError('Not authenticated', 401);
  return req.user.id;
}

function sessionIdOf(req: Request): string {
  return String(req.params.sessionId);
}

export class SessionsController {
  /** GET /sessions/:sessionId — everything the room screen needs, with the phase from the server. */
  static async getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const room = await SessionRoomService.getRoom(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: room, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /** GET /sessions/:sessionId/token — a LiveKit token for the room (verified email required). */
  static async getLivekitToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SessionRoomService.issueToken(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /sessions/:sessionId/goal */
  static async setGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { goal } = req.body as SetGoalInput;
      const session = await SessionsService.setGoal(sessionIdOf(req), currentUserId(req), goal);
      res.status(200).json({ data: session, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /sessions/join/:sessionId (deprecated)
   * Presence now comes from LiveKit webhooks, never from the browser. This only returns the
   * current state so the old room page keeps working until it is replaced.
   */
  static async joinSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await SessionsService.getSessionStatus(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: { session, isActive: session.status === 'ACTIVE' }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /** POST /sessions/:sessionId/complete — ends the session once its time is up. */
  static async completeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await SessionRoomService.complete(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: { session, message: 'Session completed' }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /** POST /sessions/:sessionId/extend — "keep going 15 minutes", for the caller only. */
  static async extend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const room = await SessionRoomService.extend(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: room, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /** POST /sessions/:sessionId/solo — continue alone when the partner is late. */
  static async acceptSolo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const room = await SessionRoomService.acceptSolo(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: room, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /** GET /sessions/status/:sessionId (deprecated, replaced by GET /sessions/:sessionId) */
  static async getSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await SessionsService.getSessionStatus(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: { session }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────

  static async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasks = await SessionTasksService.list(sessionIdOf(req), currentUserId(req));
      res.status(200).json({ data: { tasks }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await SessionTasksService.create(
        sessionIdOf(req),
        currentUserId(req),
        req.body as CreateSessionTaskInput,
      );
      res.status(201).json({ data: task, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await SessionTasksService.update(
        sessionIdOf(req),
        currentUserId(req),
        String(req.params.taskId),
        req.body as UpdateSessionTaskInput,
      );
      res.status(200).json({ data: task, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await SessionTasksService.remove(sessionIdOf(req), currentUserId(req), String(req.params.taskId));
      res.status(200).json({ data: { success: true }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /** POST /sessions/:sessionId/report — report the partner, block them and leave, in one step. */
  static async reportPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await SessionReportService.reportPartner(sessionIdOf(req), currentUserId(req), req.body as ReportFromRoomInput);
      res.status(201).json({ data: { success: true }, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  // ── Reflection, upcoming, history ─────────────────────────────────

  /**
   * POST /sessions/reflections
   */
  static async createReflection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = currentUserId(req);

      const { sessionId, text, rating } = req.body as { sessionId: string; text: string; rating?: number };

      if (!sessionId || !text) {
        throw new AppError('Session ID and text are required', 400);
      }

      if (text.length > 1000) {
        throw new AppError('Reflection must be 1000 characters or fewer', 400);
      }

      const reflection = await SessionsService.createReflection({ sessionId, userId, text, rating });

      res.status(200).json({ data: reflection, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/sessions/upcoming
   */
  static async getUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await SessionsService.getUpcomingSessions(currentUserId(req));
      res.status(200).json({ data: sessions, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/sessions/history
   */
  static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await SessionsService.getSessionHistory(currentUserId(req), page, limit);
      res.status(200).json({ ...result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
