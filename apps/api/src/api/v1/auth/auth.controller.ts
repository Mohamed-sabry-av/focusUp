import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { generateTokens, verifyRefreshToken } from '../../../lib/jwt';
import type { RegisterInput, LoginInput } from '@focusUp/shared-types';
import { AppError } from '../../../utils/errors';
import { env } from '@focusUp/env/server';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as RegisterInput;
      const user = await AuthService.register(data);
      const { accessToken, refreshToken } = generateTokens(user.id);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 mins
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as LoginInput;
      const user = await AuthService.login(data);

      const { accessToken, refreshToken } = generateTokens(user.id);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as any;
      if (!user) throw new AppError('Google authentication failed', 401);

      const { accessToken, refreshToken } = generateTokens(user.id);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.redirect(`${env.CORS_ORIGIN}/dashboard`);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.query.token as string;
      if (!token) throw new AppError('Token is required', 400);

      await AuthService.verifyEmail(token);
      res.status(200).json({ data: { message: 'Email verified successfully' }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await AuthService.resendVerification(req.user.id);
      res.status(200).json({ data: { message: 'Verification email sent' }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) throw new AppError('No refresh token provided', 401);

      const payload = verifyRefreshToken(refreshToken);
      const user = await AuthService.getUserById(payload.sub);
      
      if (!user) throw new AppError('Invalid token or user not found', 401);
      if (user.isBanned) throw new AppError('Account suspended', 403);
      if (!user.isActive) throw new AppError('Account deactivated', 403);

      const tokens = generateTokens(user.id);

      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({ message: 'Tokens refreshed' });
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
        next(new AppError('Invalid or expired refresh token', 401));
      } else {
        next(error);
      }
    }
  }
}
