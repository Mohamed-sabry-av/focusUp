import type { Request, Response, NextFunction } from 'express';
import { SessionsService } from './sessions.service';
import { AppError } from '../../../utils/errors';

export class SessionsController {
  /**
   * GET /sessions/token/:sessionId
   * Generate a LiveKit token for the authenticated user to join a session.
   */
  static async getLivekitToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const { sessionId } = req.params as { sessionId: string };
      const result = await SessionsService.generateLivekitToken(sessionId, req.user.id);

      res.status(200).json({ data: result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /sessions/goal/:sessionId
   * Set the authenticated user's goal for a session.
   */
  static async setGoal(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const { sessionId } = req.params as { sessionId: string };
      const { goal } = req.body as { goal: string };

      if (!goal || typeof goal !== 'string') {
        throw new AppError('Goal is required and must be a string', 400);
      }

      if (goal.length > 200) {
        throw new AppError('Goal must be 200 characters or fewer', 400);
      }

      const session = await SessionsService.setGoal(sessionId, req.user.id, goal);

      res.status(200).json({ data: session, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /sessions/join/:sessionId
   */
  static async joinSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { sessionId } = req.params as { sessionId: string };
      const result = await SessionsService.joinSession(sessionId, req.user.id);
      res.status(200).json({ data: result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /sessions/complete/:sessionId
   */
  static async completeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { sessionId } = req.params as { sessionId: string };
      const session = await SessionsService.completeSession(sessionId, req.user.id);
      res.status(200).json({ data: { session, message: 'Session completed' }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /sessions/status/:sessionId
   */
  static async getSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { sessionId } = req.params as { sessionId: string };
      const session = await SessionsService.getSessionStatus(sessionId, req.user.id);
      res.status(200).json({ data: { session }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /sessions/reflections
   */
  static async createReflection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      
      const { sessionId, text, rating } = req.body as { sessionId: string; text: string; rating?: number };
      
      if (!sessionId || !text) {
        throw new AppError('Session ID and text are required', 400);
      }
      
      if (text.length > 1000) {
        throw new AppError('Reflection must be 1000 characters or fewer', 400);
      }

      const reflection = await SessionsService.createReflection({
        sessionId,
        userId: req.user.id,
        text,
        rating,
      });
      
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
      if (!req.user) throw new AppError('Not authenticated', 401);

      const sessions = await SessionsService.getUpcomingSessions(req.user.id);
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
      if (!req.user) throw new AppError('Not authenticated', 401);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await SessionsService.getSessionHistory(req.user.id, page, limit);
      res.status(200).json({ ...result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}

