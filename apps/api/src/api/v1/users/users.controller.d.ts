import type { Request, Response, NextFunction } from 'express';
export declare class UsersController {
    static getMe(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateOnboarding(req: Request, res: Response, next: NextFunction): Promise<void>;
}
