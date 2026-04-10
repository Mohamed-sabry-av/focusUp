import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/errors';

export class NotificationsController {
  // Example placeholder
  static async placeholder(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ message: 'notifications endpoint' });
    } catch (error) {
      next(error);
    }
  }
}
