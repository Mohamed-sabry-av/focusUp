import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/errors';
export class BookingsController {
    // Example placeholder
    static async placeholder(req, res, next) {
        try {
            res.json({ message: 'bookings endpoint' });
        }
        catch (error) {
            next(error);
        }
    }
}
