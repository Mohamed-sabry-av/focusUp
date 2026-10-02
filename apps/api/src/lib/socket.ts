import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { fromNodeHeaders } from "better-auth/node";
import { env } from "@focusUp/env/server";
import { auth } from "./auth";
import { redis } from "./redis";
import { prisma } from "./prisma";

let io: SocketServer;

export function initializeSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  // Namespace for all app notifications
  const notifications = io.of("/notifications");

  // Authentication middleware
  notifications.use(async (socket, next) => {
    try {
      // The browser sends the Better Auth session cookie with the handshake.
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(socket.handshake.headers),
      });

      if (!session) {
        return next(new Error("Authentication required"));
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return next(new Error("User not found"));
      }
      if (user.isBanned) {
        return next(new Error("Account suspended"));
      }
      if (!user.isActive) {
        return next(new Error("Account deactivated"));
      }

      socket.data.userId = user.id;
      socket.data.email = user.email;
      socket.data.username = user.username;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  notifications.on("connection", async (socket) => {
    const userId = socket.data.userId;
    console.log(`🔌 User connected: ${userId}`);

    // Store userId → socketId in Redis
    await redis.set(`user:socket:${userId}`, socket.id);

    socket.on("disconnect", async () => {
      console.log(`🔌 User disconnected: ${userId}`);
      await redis.del(`user:socket:${userId}`);
    });
  });

  return io;
}

// Helper: send event to specific user
export async function sendToUser(
  userId: string,
  event: string,
  data: any,
): Promise<boolean> {
  const socketId = await redis.get(`user:socket:${userId}`);
  if (!socketId || !io) return false;

  io.of("/notifications").to(socketId).emit(event, data);
  return true;
}

export { io };
