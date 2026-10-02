import express from "express";
import usersRoutes from "./users/users.routes";
import sessionsRoutes from "./sessions/sessions.routes";
import bookingsRoutes from "./bookings/bookings.routes";
import webhooksRoutes from "./webhooks/webhooks.routes";
import notificationsRoutes from "./notifications/notifications.routes";
import reportsRoutes from "./reports/reports.routes";
import blocksRoutes from "./blocks/blocks.routes";
import adminRoutes from "./admin/admin.routes";

import { authMiddleware, requireAuth } from "../../middleware/auth";

const v1Router = express.Router();

// Public routes (sign-in and sign-up live in Better Auth under /api/auth)
v1Router.use("/webhooks", webhooksRoutes);

// Protected routes
v1Router.use(authMiddleware, requireAuth);

v1Router.use("/users", usersRoutes);
v1Router.use("/sessions", sessionsRoutes);
v1Router.use("/bookings", bookingsRoutes);
v1Router.use("/notifications", notificationsRoutes);
v1Router.use("/reports", reportsRoutes);
v1Router.use("/blocks", blocksRoutes);
v1Router.use("/admin", adminRoutes);

export default v1Router;
