// ─── Queue Entry (player waiting in matchmaking) ─────────────────────
export type QueueEntry = {
  userId: string;
  userName: string;
  rating: number;
  joinedAt: number; // unix timestamp ms
};

// ─── Match Player (in-memory during active match) ────────────────────
export type MatchPlayer = {
  userId: string;
  userName: string;
  rating: number;
  solved: Set<number>; // questionIds solved
  ready: boolean;
};

// ─── Active Match State (held in memory while match is live) ─────────
export type ActiveMatch = {
  matchId: string;
  players: [MatchPlayer, MatchPlayer];
  questionIds: number[];
  status: 'countdown' | 'running' | 'finished';
  startedAt: number | null;
  endsAt: number | null;
  timerId: ReturnType<typeof setInterval> | null;
  countdownId: ReturnType<typeof setInterval> | null;
};

// ─── Match Found Payload ─────────────────────────────────────────────
export type MatchFoundPayload = {
  matchId: string;
  opponent: {
    id: string;
    name: string;
    rating: number;
  };
  questions: Array<{
    id: number;
    category: string;
    difficulty: string;
    question: string;
  }>;
};

// ─── Submission Result Payload ───────────────────────────────────────
export type SubmissionResultPayload = {
  questionId: number;
  status: 'passed' | 'failed' | 'error';
  testsPassed: number;
  totalTests: number;
};

// ─── Match End Payload ──────────────────────────────────────────────
export type MatchEndPayload = {
  matchId: string;
  winnerId: string | null;
  ratingChanges: Record<string, number>;
};

// ─── Match History Item (returned from REST API) ─────────────────────
export type MatchHistoryItem = {
  matchId: string;
  opponentName: string;
  opponentRating: number;
  result: 'win' | 'loss' | 'draw';
  ratingChange: number;
  startedAt: string | null;
  endedAt: string | null;
};

// ─── Constants ──────────────────────────────────────────────────────
export const QUEUE_KEY = 'matchmaking:queue';
export const QUEUE_DATA_PREFIX = 'matchmaking:player:';
export const COUNTDOWN_SECONDS = 5;
export const RATING_RANGE_INITIAL = 200;
export const RATING_RANGE_MAX = 500;
export const RATING_RANGE_EXPAND_INTERVAL_MS = 10_000; // widen range every 10s
