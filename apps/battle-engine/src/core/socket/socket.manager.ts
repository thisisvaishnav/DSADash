import http from 'http';
import { Server } from 'socket.io';
import { socketConfig } from '../../config/socket.config';
import {
  TypedServer,
  TypedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './socket.types';

class SocketManager {
  private io: TypedServer | null = null;
  private userSocketMap: Map<string, string> = new Map(); // userId → socketId

  /** Initialize Socket.IO server */
  init = (server: http.Server): TypedServer => {
    if (this.io) return this.io;

    this.io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(server, socketConfig);

    this.io.on('connection', (socket: TypedSocket) => {
      const userId = socket.data.userId;
      if (userId) {
        this.userSocketMap.set(userId, socket.id);
      }

      socket.on('disconnect', () => {
        if (userId) {
          this.userSocketMap.delete(userId);
        }
      });
    });

    console.log('✅ Socket.IO initialized');
    return this.io;
  };

  /** Get the Socket.IO server instance */
  getIO = (): TypedServer => {
    if (!this.io) {
      throw new Error('Socket.IO not initialized. Call init() first.');
    }
    return this.io;
  };

  /** Get socket ID for a user */
  getSocketId = (userId: string): string | undefined => {
    return this.userSocketMap.get(userId);
  };

  /** Check if a user is currently connected */
  isUserOnline = (userId: string): boolean => {
    return this.userSocketMap.has(userId);
  };

  /** Emit event to a specific user */
  emitToUser = <E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): boolean => {
    const socketId = this.userSocketMap.get(userId);
    if (!socketId || !this.io) return false;

    this.io.to(socketId).emit(event, ...args);
    return true;
  };

  /** Emit event to a match room */
  emitToMatch = <E extends keyof ServerToClientEvents>(
    matchId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void => {
    if (!this.io) return;
    this.io.to(`match:${matchId}`).emit(event, ...args);
  };

  /** Add a socket to a match room */
  joinMatchRoom = async (userId: string, matchId: string): Promise<void> => {
    const socketId = this.userSocketMap.get(userId);
    if (!socketId || !this.io) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      await socket.join(`match:${matchId}`);
      socket.data.currentMatchId = matchId;
    }
  };

  /** Remove a socket from a match room */
  leaveMatchRoom = async (userId: string, matchId: string): Promise<void> => {
    const socketId = this.userSocketMap.get(userId);
    if (!socketId || !this.io) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      await socket.leave(`match:${matchId}`);
      socket.data.currentMatchId = undefined;
    }
  };

  /** Get count of connected clients */
  getOnlineCount = (): number => {
    return this.userSocketMap.size;
  };

  /** Register a user's socket mapping (for auth middleware) */
  registerUser = (userId: string, socketId: string): void => {
    this.userSocketMap.set(userId, socketId);
  };

  /** Unregister a user's socket mapping */
  unregisterUser = (userId: string): void => {
    this.userSocketMap.delete(userId);
  };
}

export const socketManager = new SocketManager();
