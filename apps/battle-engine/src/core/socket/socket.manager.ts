// socket.manager.ts
import http from 'http';
import { Server } from 'socket.io';
import { socketConfig } from '../../config/socket.config';
import { TypedServer, TypedSocket, ServerToClientEvents } from './socket.types';
import { auth } from '../../features/auth/auth.service';
import { registerMatchHandlers } from '../../features/match/match.socket';
import { registerChatHandlers } from '../../features/chat/chat.socket';
import { registerSubmissionHandlers } from '../../features/submission/submission.socket';

// ─── State ────────────────────────────────────────────────────────────
let io: TypedServer | null = null;
const userSockets = new Map<string, string>(); // userId → socketId

// ─── Initialize ───────────────────────────────────────────────────────
export const initSocket = (server: http.Server): TypedServer => {
  if (io) return io;

  io = new Server(server, socketConfig);

  io.use(authMiddleware);           // verify token before connection

  io.on('connection', (socket) => {
    const { userId, userName } = socket.data;
    userSockets.set(userId, socket.id);
    console.log(`🟢 ${userName} connected (${userSockets.size} online)`);

    registerMatchHandlers(socket);
    registerChatHandlers(socket);
    registerSubmissionHandlers(socket);

    socket.on('disconnect', (reason) => {
      userSockets.delete(userId);
      console.log(`🔴 ${userName} disconnected: ${reason} (${userSockets.size} online)`);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

// ─── Auth Middleware ──────────────────────────────────────────────────
const authMiddleware = async (socket: TypedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    // Example for integrating Better Auth token verification:
    // (Replace with your actual Better Auth logic, api, and types)

    // import { auth } from '../../auth';   // Make sure to import your auth module

    // Import the auth instance at the top:
    // import { auth } from '../../features/auth/auth.service';
    const session = await auth.api.getSession({
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!session || !session.user) {
      return next(new Error('Invalid or expired token'));
    }
    socket.data.userId = session.user.id;
    socket.data.userName = session.user.name;
    socket.data.userRating = session.user.rating;


    next();
  } catch {
    next(new Error('Invalid token'));
  }
};

// ─── Getters ─────────────────────────────────────────────────────────
export const getIO = (): TypedServer => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

export const getSocketId = (userId: string): string | undefined =>
  userSockets.get(userId);

export const isUserOnline = (userId: string): boolean =>
  userSockets.has(userId);

export const getOnlineCount = (): number =>
  userSockets.size;

// ─── Emitters ────────────────────────────────────────────────────────
export const emitToUser = (
  userId: string,
  event: keyof ServerToClientEvents,
  data: any,
): boolean => {
  const socketId = userSockets.get(userId);
  if (!socketId || !io) return false;
  io.to(socketId).emit(event, data);
  return true;
};

export const emitToMatch = (
  matchId: string,
  event: keyof ServerToClientEvents,
  data: any,
): void => {
  if (!io) return;
  io.to(`match:${matchId}`).emit(event, data);
};

// ─── Room Management ─────────────────────────────────────────────────
export const joinMatchRoom = async (userId: string, matchId: string): Promise<void> => {
  const socketId = userSockets.get(userId);
  if (!socketId || !io) return;

  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;

  await socket.join(`match:${matchId}`);
  socket.data.currentMatchId = matchId;
};

export const leaveMatchRoom = async (userId: string, matchId: string): Promise<void> => {
  const socketId = userSockets.get(userId);
  if (!socketId || !io) return;

  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;

  await socket.leave(`match:${matchId}`);
  socket.data.currentMatchId = undefined;
};

// ─── Shutdown ────────────────────────────────────────────────────────
export const shutdownSocket = async (): Promise<void> => {
  if (!io) return;
  io.disconnectSockets(true);
  io.close();
  userSockets.clear();
  io = null;
  console.log('🔌 Socket.IO shut down');
};