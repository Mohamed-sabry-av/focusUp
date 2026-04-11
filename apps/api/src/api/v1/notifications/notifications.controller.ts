import type { Request, Response, NextFunction } from 'express';

export class NotificationsController {
  // Example placeholder
  static async placeholder(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ message: 'notifications endpoint' });
    } catch (error) {
      next(error);
    }
  }
}
