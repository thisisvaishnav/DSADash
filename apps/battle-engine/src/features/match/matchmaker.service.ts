import { redis } from '../../core/queue/redis.client';
import {
  QueueEntry,
  QUEUE_KEY,
  QUEUE_DATA_PREFIX,
  RATING_RANGE_INITIAL,
  RATING_RANGE_MAX,
  RATING_RANGE_EXPAND_INTERVAL_MS,
} from './match.types';

// ─── Add Player to Queue ────────────────────────────────────────────
export const addToQueue = async (entry: QueueEntry): Promise<void> => {
  const client = redis.getClient();

  // Sorted set: score = rating, member = userId
  await client.zAdd(QUEUE_KEY, { score: entry.rating, value: entry.userId });

  // Store player data in a hash for quick lookup
  await client.hSet(`${QUEUE_DATA_PREFIX}${entry.userId}`, {
    userName: entry.userName,
    rating: entry.rating.toString(),
    joinedAt: entry.joinedAt.toString(),
  });
};

// ─── Remove Player from Queue ───────────────────────────────────────
export const removeFromQueue = async (userId: string): Promise<void> => {
  const client = redis.getClient();
  await client.zRem(QUEUE_KEY, userId);
  await client.del(`${QUEUE_DATA_PREFIX}${userId}`);
};

// ─── Check if Player is in Queue ────────────────────────────────────
export const isInQueue = async (userId: string): Promise<boolean> => {
  const client = redis.getClient();
  const score = await client.zScore(QUEUE_KEY, userId);
  return score !== null;
};

// ─── Get Queue Position ─────────────────────────────────────────────
export const getQueuePosition = async (userId: string): Promise<number> => {
  const client = redis.getClient();
  const rank = await client.zRank(QUEUE_KEY, userId);
  return rank !== null ? rank + 1 : -1;
};

// ─── Get Queue Size ─────────────────────────────────────────────────
export const getQueueSize = async (): Promise<number> => {
  const client = redis.getClient();
  return client.zCard(QUEUE_KEY);
};

// ─── Find a Match for a Player ──────────────────────────────────────
// Looks for the closest-rated opponent within an expanding rating range.
// Returns the opponent's QueueEntry if found, null otherwise.
export const findMatch = async (userId: string): Promise<QueueEntry | null> => {
  const client = redis.getClient();

  const playerRating = await client.zScore(QUEUE_KEY, userId);
  if (playerRating === null) return null;

  const playerData = await client.hGetAll(`${QUEUE_DATA_PREFIX}${userId}`);
  if (!playerData.joinedAt) return null;

  const waitTimeMs = Date.now() - Number(playerData.joinedAt);
  const expandFactor = Math.floor(waitTimeMs / RATING_RANGE_EXPAND_INTERVAL_MS);
  const ratingRange = Math.min(
    RATING_RANGE_INITIAL + expandFactor * 100,
    RATING_RANGE_MAX,
  );

  const minRating = playerRating - ratingRange;
  const maxRating = playerRating + ratingRange;

  // Find all players in rating range
  const candidates = await client.zRangeByScore(QUEUE_KEY, minRating, maxRating);

  // Filter out self, find closest rating
  let bestMatch: string | null = null;
  let bestDiff = Infinity;

  for (const candidateId of candidates) {
    if (candidateId === userId) continue;

    const candidateRating = await client.zScore(QUEUE_KEY, candidateId);
    if (candidateRating === null) continue;

    const diff = Math.abs(candidateRating - playerRating);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMatch = candidateId;
    }
  }

  if (!bestMatch) return null;

  const matchData = await client.hGetAll(`${QUEUE_DATA_PREFIX}${bestMatch}`);
  if (!matchData.userName) return null;

  return {
    userId: bestMatch,
    userName: matchData.userName,
    rating: Number(matchData.rating),
    joinedAt: Number(matchData.joinedAt),
  };
};

// ─── Remove Both Players from Queue (after pairing) ─────────────────
export const removePairFromQueue = async (
  userId1: string,
  userId2: string,
): Promise<void> => {
  await Promise.all([removeFromQueue(userId1), removeFromQueue(userId2)]);
};

// ─── Clear Entire Queue (for shutdown / testing) ─────────────────────
export const clearQueue = async (): Promise<void> => {
  const client = redis.getClient();
  const members = await client.zRange(QUEUE_KEY, 0, -1);

  const pipeline = client.multi();
  pipeline.del(QUEUE_KEY);
  for (const member of members) {
    pipeline.del(`${QUEUE_DATA_PREFIX}${member}`);
  }
  await pipeline.exec();
};
