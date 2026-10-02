import express from 'express';
import { BookingsController } from './bookings.controller';
import { validate } from '../../../middleware/validate';
import { CreateBookingInput } from './bookings.validation';

const router = express.Router();

// POST /api/v1/bookings — Create a booking request
router.post('/', validate(CreateBookingInput), BookingsController.create);

// GET /api/v1/bookings — List user's booking requests
router.get('/', BookingsController.list);

// GET /api/v1/bookings/available — Get available pending bookings for calendar view
router.get('/available', BookingsController.getAvailable);

// DELETE /api/v1/bookings/:id — Cancel a booking request
router.delete('/:id', BookingsController.cancel);

export default router;
