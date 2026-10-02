import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server as HttpServer } from 'http';
import { initializeSocket, sendToUser, io } from './socket';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';
import { redis } from './redis';
import jwt from 'jsonwebtoken';

vi.mock('./redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../services/email.service', () => ({
  EmailService: {
    sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Socket Gateway & Notifications', () => {
  let httpServer: HttpServer;
  
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.JWT_SECRET = 'test-secret';

    // Re-establish EmailService mock after reset
    (EmailService.sendBookingConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Only close if it was initialized
    if (io) {
      io.close();
    }
  });

  describe('Initialization', () => {
    it('initializes socket.io correctly', () => {
      httpServer = new HttpServer();
      const server = initializeSocket(httpServer);
      expect(server).toBeDefined();
    });
  });

  describe('sendToUser', () => {
    it('returns false if user socket is not in redis', async () => {
      httpServer = new HttpServer();
      initializeSocket(httpServer);
      
      (redis.get as any).mockResolvedValue(null);
      const result = await sendToUser('user-1', 'test_event', { foo: 'bar' });
      expect(result).toBe(false);
      expect(redis.get).toHaveBeenCalledWith('user:socket:user-1');
    });

    it('emits to user socket if socket is found', async () => {
      httpServer = new HttpServer();
      initializeSocket(httpServer);
      
      // Mock the emit function sequence
      const mockEmit = vi.fn();
      const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
      const mockOf = vi.fn().mockReturnValue({ to: mockTo });
      
      // Override the initialized io object's internal structure
      if (io) {
        vi.spyOn(io, 'of').mockImplementation(mockOf);
      }

      (redis.get as any).mockResolvedValue('socket-123');
      
      const result = await sendToUser('user-2', 'test_event', { data: 1 });
      
      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalledWith('user:socket:user-2');
      expect(mockTo).toHaveBeenCalledWith('socket-123');
      expect(mockEmit).toHaveBeenCalledWith('test_event', { data: 1 });
    });
  });

  describe('NotificationService.notifyMatch', () => {
    it('sends socket events & emails for both users when matched', async () => {
      httpServer = new HttpServer();
      initializeSocket(httpServer);

      const mockEmit = vi.fn();
      const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
      vi.spyOn(io, 'of').mockReturnValue({ to: mockTo } as any);

      (redis.get as any).mockImplementation((key: string) => {
        if (key === 'user:socket:user1') return 'socket1';
        if (key === 'user:socket:user2') return 'socket2';
        return null;
      });

      const session = {
        id: 'sess-123',
        scheduledAt: new Date(),
        durationMin: 50,
        user1: { id: 'user1', displayName: 'A', avatarUrl: 'a.png', email: 'a@c.com', timezone: 'UTC' },
        user2: { id: 'user2', displayName: 'B', avatarUrl: 'b.png', email: 'b@c.com', timezone: 'UTC' },
      };

      await NotificationService.notifyMatch(session);

      expect(redis.get).toHaveBeenCalledTimes(2);
      expect(mockTo).toHaveBeenCalledWith('socket1');
      expect(mockTo).toHaveBeenCalledWith('socket2');
      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledWith('match:found', expect.objectContaining({ sessionId: 'sess-123' }));
    });
  });
});
