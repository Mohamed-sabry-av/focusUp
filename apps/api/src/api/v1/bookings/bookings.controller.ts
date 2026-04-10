import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/errors';

export class BookingsController {
  // Example placeholder
  static async placeholder(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ message: 'bookings endpoint' });
    } catch (error) {
      next(error);
    }
  }
}
