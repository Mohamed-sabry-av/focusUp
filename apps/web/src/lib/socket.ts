import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(
      (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/notifications',
      {
        withCredentials: true,
        autoConnect: false,
        auth: async (cb) => {
          // Token will be sent via cookie automatically with withCredentials
          cb({});
        },
      }
    );
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
