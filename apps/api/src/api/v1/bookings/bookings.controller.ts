import type { Request, Response, NextFunction } from 'express';

export class BookingsController {
  // Example placeholder
  static async placeholder(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ message: 'bookings endpoint' });
    } catch (error) {
      next(error);
    }
  }
}
