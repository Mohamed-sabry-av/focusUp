import type { Request, Response, NextFunction } from 'express';
import { BookingsService } from './bookings.service';
import { AppError } from '../../../utils/errors';

export class BookingsController {
  /**
   * POST /bookings — Create a booking request and attempt immediate matching.
   */
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const { slotTime, durationMin } = req.body as {
        slotTime: string;
        durationMin: number;
      };

      const result = await BookingsService.createBooking(
        req.user.id,
        new Date(slotTime),
        durationMin
      );

      res.status(201).json({ data: result, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /bookings — List user's booking requests with optional filters.
   */
  static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await BookingsService.listBookings(
        req.user.id,
        status,
        page,
        limit
      );

      res.status(200).json({ ...result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /bookings/:id — Cancel a booking request.
   */
  static async cancel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const { id } = req.params as { id: string };

      const result = await BookingsService.cancelBooking(id, req.user.id);

      res.status(200).json({ data: result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
