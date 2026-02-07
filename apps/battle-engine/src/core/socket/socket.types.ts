import { Server, Socket } from 'socket.io';

// ─── Client → Server Events ───────────────────────────────────────────
export interface ClientToServerEvents {
  // Matchmaking
  'match:join-queue': (data: { userId: string }) => void;
  'match:leave-queue': (data: { userId: string }) => void;

  // In-match actions
  'match:submit-code': (data: {
    matchId: string;
    questionId: number;
    code: string;
    language: string;
  }) => void;
  'match:ready': (data: { matchId: string; userId: string }) => void;

  // Chat
  'chat:send-message': (data: {
    receiverId: string;
    content: string;
  }) => void;
  'chat:typing': (data: { receiverId: string }) => void;
  'chat:stop-typing': (data: { receiverId: string }) => void;
}

// ─── Server → Client Events ───────────────────────────────────────────
export interface ServerToClientEvents {
  // Matchmaking
  'match:found': (data: {
    matchId: string;
    opponent: { id: string; name: string; rating: number };
    questions: Array<{ id: number; category: string; difficulty: string; question: string }>;
  }) => void;
  'match:queue-status': (data: { position: number; estimatedWait: number }) => void;
  'match:countdown': (data: { matchId: string; seconds: number }) => void;
  'match:started': (data: { matchId: string; startedAt: string }) => void;

  // In-match updates
  'match:submission-result': (data: {
    questionId: number;
    status: string;
    testsPassed: number;
    totalTests: number;
  }) => void;
  'match:opponent-progress': (data: {
    questionId: number;
    solved: boolean;
  }) => void;
  'match:timer-update': (data: { matchId: string; remainingSeconds: number }) => void;
  'match:ended': (data: {
    matchId: string;
    winnerId: string | null;
    ratingChanges: Record<string, number>;
  }) => void;

  // Chat
  'chat:new-message': (data: {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
  }) => void;
  'chat:user-typing': (data: { userId: string }) => void;
  'chat:user-stop-typing': (data: { userId: string }) => void;

  // System
  'error': (data: { message: string; code?: string }) => void;
}

// ─── Inter-Server Events (for scaling with Redis adapter) ─────────────
export interface InterServerEvents {
  ping: () => void;
}

// ─── Socket Data (attached to each socket) ────────────────────────────
export interface SocketData {
  userId: string;
  userName: string;
  userRating: number;
  currentMatchId?: string;
}

// ─── Typed Server & Socket ────────────────────────────────────────────
export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
