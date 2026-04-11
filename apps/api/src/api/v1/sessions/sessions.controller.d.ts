import type { Request, Response, NextFunction } from 'express';
export declare class SessionsController {
    /**
     * GET /sessions/token/:sessionId
     * Generate a LiveKit token for the authenticated user to join a session.
     */
    static getLivekitToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /sessions/goal/:sessionId
     * Set the authenticated user's goal for a session.
     */
    static setGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /sessions/join/:sessionId
     */
    static joinSession(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /sessions/complete/:sessionId
     */
    static completeSession(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /sessions/status/:sessionId
     */
    static getSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /sessions/reflections
     */
    static createReflection(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/sessions/upcoming
     */
    static getUpcoming(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/sessions/history
     */
    static getHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
}
