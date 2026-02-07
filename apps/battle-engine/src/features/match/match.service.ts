import { db } from '../../core/database/db.client';
import { MATCH_DURATION_MINUTES, MATCH_QUESTIONS_COUNT } from '../../config/env.config';
import {
  ActiveMatch,
  MatchPlayer,
  MatchEndPayload,
  MatchHistoryItem,
  COUNTDOWN_SECONDS,
} from './match.types';
import { emitToMatch, emitToUser, joinMatchRoom, leaveMatchRoom } from '../../core/socket/socket.manager';

// ─── In-Memory Active Matches ───────────────────────────────────────
const activeMatches = new Map<string, ActiveMatch>();

// ─── Get Random Questions ───────────────────────────────────────────
export const getRandomQuestions = async (count: number = MATCH_QUESTIONS_COUNT) => {
  // Prisma doesn't support ORDER BY RANDOM natively, use raw query
  const questions = await db.$queryRawUnsafe<
    Array<{ id: number; category: string; difficulty: string; question: string }>
  >(
    `SELECT id, category, difficulty, question FROM "Question" ORDER BY RANDOM() LIMIT $1`,
    count,
  );
  return questions;
};

// ─── Create Match in DB ─────────────────────────────────────────────
export const createMatch = async (
  player1: { userId: string; userName: string; rating: number },
  player2: { userId: string; userName: string; rating: number },
): Promise<ActiveMatch> => {
  const questions = await getRandomQuestions();

  const match = await db.match.create({
    data: {
      status: 'WAITING',
      participants: {
        create: [
          { userId: player1.userId },
          { userId: player2.userId },
        ],
      },
      questions: {
        create: questions.map((q, index) => ({
          questionId: q.id,
          order: index + 1,
        })),
      },
    },
  });

  // Build in-memory state
  const activeMatch: ActiveMatch = {
    matchId: match.id,
    players: [
      {
        userId: player1.userId,
        userName: player1.userName,
        rating: player1.rating,
        solved: new Set(),
        ready: false,
      },
      {
        userId: player2.userId,
        userName: player2.userName,
        rating: player2.rating,
        solved: new Set(),
        ready: false,
      },
    ],
    questionIds: questions.map((q) => q.id),
    status: 'countdown',
    startedAt: null,
    endsAt: null,
    timerId: null,
    countdownId: null,
  };

  activeMatches.set(match.id, activeMatch);

  // Join both players to the match room
  await Promise.all([
    joinMatchRoom(player1.userId, match.id),
    joinMatchRoom(player2.userId, match.id),
  ]);

  // Emit match:found to each player with their opponent's info
  emitToUser(player1.userId, 'match:found', {
    matchId: match.id,
    opponent: { id: player2.userId, name: player2.userName, rating: player2.rating },
    questions,
  });

  emitToUser(player2.userId, 'match:found', {
    matchId: match.id,
    opponent: { id: player1.userId, name: player1.userName, rating: player1.rating },
    questions,
  });

  return activeMatch;
};

// ─── Mark Player Ready ──────────────────────────────────────────────
export const markPlayerReady = (matchId: string, userId: string): boolean => {
  const match = activeMatches.get(matchId);
  if (!match || match.status !== 'countdown') return false;

  const player = match.players.find((p) => p.userId === userId);
  if (!player) return false;

  player.ready = true;

  // If both players are ready, start the countdown
  const allReady = match.players.every((p) => p.ready);
  if (allReady) {
    startCountdown(match);
  }

  return true;
};

// ─── Countdown Before Match Starts ──────────────────────────────────
const startCountdown = (match: ActiveMatch): void => {
  let remaining = COUNTDOWN_SECONDS;

  match.countdownId = setInterval(() => {
    emitToMatch(match.matchId, 'match:countdown', {
      matchId: match.matchId,
      seconds: remaining,
    });

    remaining -= 1;

    if (remaining < 0) {
      if (match.countdownId) clearInterval(match.countdownId);
      match.countdownId = null;
      startMatch(match);
    }
  }, 1000);
};

// ─── Start the Match ────────────────────────────────────────────────
const startMatch = (match: ActiveMatch): void => {
  const now = Date.now();
  match.status = 'running';
  match.startedAt = now;
  match.endsAt = now + MATCH_DURATION_MINUTES * 60 * 1000;

  // Update DB
  db.match.update({
    where: { id: match.matchId },
    data: { status: 'RUNNING', startedAt: new Date(now) },
  }).catch((err) => console.error('Failed to update match status:', err));

  emitToMatch(match.matchId, 'match:started', {
    matchId: match.matchId,
    startedAt: new Date(now).toISOString(),
  });

  // Start the timer
  match.timerId = setInterval(() => {
    if (!match.endsAt) return;

    const remainingSeconds = Math.max(
      0,
      Math.floor((match.endsAt - Date.now()) / 1000),
    );

    emitToMatch(match.matchId, 'match:timer-update', {
      matchId: match.matchId,
      remainingSeconds,
    });

    if (remainingSeconds <= 0) {
      endMatch(match.matchId, null);
    }
  }, 1000);
};

// ─── Record a Submission ────────────────────────────────────────────
// ─── Mark Question Solved (called by worker callback) ───────────────
export const markQuestionSolved = (
  matchId: string,
  userId: string,
  questionId: number,
  testsPassed: number,
  totalTests: number,
): void => {
  const match = activeMatches.get(matchId);
  if (!match || match.status !== 'running') return;

  const player = match.players.find((p) => p.userId === userId);
  if (!player) return;

  const passed = testsPassed === totalTests;

  if (passed) {
    player.solved.add(questionId);
  }

  // Notify the player of their result
  emitToUser(userId, 'match:submission-result', {
    questionId,
    status: passed ? 'passed' : 'failed',
    testsPassed,
    totalTests,
  });

  // Notify opponent of progress (without revealing code)
  const opponent = match.players.find((p) => p.userId !== userId);
  if (opponent) {
    emitToUser(opponent.userId, 'match:opponent-progress', {
      questionId,
      solved: passed,
    });
  }

  // Check if this player solved all questions → early win
  if (player.solved.size === match.questionIds.length) {
    endMatch(matchId, userId);
  }
};

// ─── End Match ──────────────────────────────────────────────────────
export const endMatch = async (
  matchId: string,
  winnerId: string | null,
): Promise<MatchEndPayload | null> => {
  const match = activeMatches.get(matchId);
  if (!match || match.status === 'finished') return null;

  // Clean up timers
  if (match.timerId) clearInterval(match.timerId);
  if (match.countdownId) clearInterval(match.countdownId);
  match.timerId = null;
  match.countdownId = null;
  match.status = 'finished';

  // Determine winner if not provided (timer ran out)
  if (!winnerId) {
    const [p1, p2] = match.players;
    if (p1.solved.size > p2.solved.size) winnerId = p1.userId;
    else if (p2.solved.size > p1.solved.size) winnerId = p2.userId;
    // else null = draw
  }

  // Calculate rating changes (simple ELO)
  const ratingChanges = calculateRatingChanges(match, winnerId);

  // Update DB
  const now = new Date();
  await db.match.update({
    where: { id: matchId },
    data: { status: 'FINISHED', winnerId, endedAt: now },
  });

  // Update participant rating changes
  await Promise.all(
    match.players.map((p) =>
      db.matchParticipant.update({
        where: { matchId_userId: { matchId, userId: p.userId } },
        data: { ratingChange: ratingChanges[p.userId] },
      }),
    ),
  );

  // Update user ratings
  await Promise.all(
    match.players.map((p) =>
      db.user.update({
        where: { id: p.userId },
        data: { rating: { increment: ratingChanges[p.userId] ?? 0 } },
      }),
    ),
  );

  const payload: MatchEndPayload = { matchId, winnerId, ratingChanges };

  emitToMatch(matchId, 'match:ended', payload);

  // Leave rooms and clean up
  await Promise.all(
    match.players.map((p) => leaveMatchRoom(p.userId, matchId)),
  );
  activeMatches.delete(matchId);

  return payload;
};

// ─── Simple ELO Calculation ─────────────────────────────────────────
const K_FACTOR = 32;

const calculateRatingChanges = (
  match: ActiveMatch,
  winnerId: string | null,
): Record<string, number> => {
  const [p1, p2] = match.players;

  const expected1 = 1 / (1 + Math.pow(10, (p2.rating - p1.rating) / 400));
  const expected2 = 1 - expected1;

  let score1: number;
  let score2: number;

  if (!winnerId) {
    score1 = 0.5;
    score2 = 0.5;
  } else if (winnerId === p1.userId) {
    score1 = 1;
    score2 = 0;
  } else {
    score1 = 0;
    score2 = 1;
  }

  return {
    [p1.userId]: Math.round(K_FACTOR * (score1 - expected1)),
    [p2.userId]: Math.round(K_FACTOR * (score2 - expected2)),
  };
};

// ─── Getters ────────────────────────────────────────────────────────
export const getActiveMatch = (matchId: string): ActiveMatch | undefined =>
  activeMatches.get(matchId);

export const getActiveMatchByUser = (userId: string): ActiveMatch | undefined => {
  for (const match of activeMatches.values()) {
    if (match.players.some((p) => p.userId === userId)) return match;
  }
  return undefined;
};

export const getActiveMatchCount = (): number =>
  activeMatches.size;

// ─── Match History (DB query) ───────────────────────────────────────
export const getMatchHistory = async (
  userId: string,
  page: number,
  limit: number,
): Promise<MatchHistoryItem[]> => {
  const skip = (page - 1) * limit;

  const participations = await db.matchParticipant.findMany({
    where: { userId },
    orderBy: { match: { createdAt: 'desc' } },
    skip,
    take: limit,
    include: {
      match: {
        include: {
          participants: {
            where: { userId: { not: userId } },
            include: { user: { select: { name: true, rating: true } } },
          },
        },
      },
    },
  });

  return participations.map((p) => {
    const opponent = p.match.participants[0];
    const isWinner = p.match.winnerId === userId;
    const isDraw = p.match.winnerId === null && p.match.status === 'FINISHED';

    return {
      matchId: p.matchId,
      opponentName: opponent?.user.name ?? 'Unknown',
      opponentRating: opponent?.user.rating ?? 0,
      result: isDraw ? 'draw' : isWinner ? 'win' : 'loss',
      ratingChange: p.ratingChange ?? 0,
      startedAt: p.match.startedAt?.toISOString() ?? null,
      endedAt: p.match.endedAt?.toISOString() ?? null,
    };
  });
};

// ─── Single Match Detail ────────────────────────────────────────────
export const getMatchById = async (matchId: string) => {
  return db.match.findUnique({
    where: { id: matchId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, rating: true, image: true } } },
      },
      questions: true,
      submissions: {
        select: {
          id: true,
          userId: true,
          questionId: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
};

// ─── Cleanup (for shutdown) ─────────────────────────────────────────
export const cleanupAllMatches = (): void => {
  for (const match of activeMatches.values()) {
    if (match.timerId) clearInterval(match.timerId);
    if (match.countdownId) clearInterval(match.countdownId);
  }
  activeMatches.clear();
};
