import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import usersRoutes from './users/users.routes';
import sessionsRoutes from './sessions/sessions.routes';
import bookingsRoutes from './bookings/bookings.routes';
import webhooksRoutes from './webhooks/webhooks.routes';
import notificationsRoutes from './notifications/notifications.routes';

import { authMiddleware, requireAuth } from '../../middleware/auth';

const v1Router = Router();

// Public routes
v1Router.use('/auth', authRoutes);
v1Router.use('/webhooks', webhooksRoutes);

// Protected routes
v1Router.use(authMiddleware, requireAuth);

v1Router.use('/users', usersRoutes);
v1Router.use('/sessions', sessionsRoutes);
v1Router.use('/bookings', bookingsRoutes);
v1Router.use('/notifications', notificationsRoutes);

export default v1Router;
