import type { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    static register(req: Request, res: Response, next: NextFunction): Promise<void>;
    static login(req: Request, res: Response, next: NextFunction): Promise<void>;
    static googleCallback(req: Request, res: Response, next: NextFunction): Promise<void>;
    static verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
    static resendVerification(req: Request, res: Response, next: NextFunction): Promise<void>;
    static logout(req: Request, res: Response, next: NextFunction): Promise<void>;
    static refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
}
