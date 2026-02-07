import { db } from '../../core/database/db.client';
import type { LeaderboardEntryItem } from './leaderboard.types';

const mapEntry = (
  entry: {
    userId: string;
    rating: number;
    wins: number;
    losses: number;
    totalMatches: number;
    winStreak: number;
    bestWinStreak: number;
    lastMatchAt: Date | null;
    user: { name: string; image: string | null };
  },
  rank: number,
): LeaderboardEntryItem => ({
  userId: entry.userId,
  name: entry.user.name,
  image: entry.user.image,
  rating: entry.rating,
  rank,
  wins: entry.wins,
  losses: entry.losses,
  totalMatches: entry.totalMatches,
  winStreak: entry.winStreak,
  bestWinStreak: entry.bestWinStreak,
  lastMatchAt: entry.lastMatchAt?.toISOString() ?? null,
});

export const getLeaderboard = async (
  page: number,
  limit: number,
): Promise<LeaderboardEntryItem[]> => {
  const skip = (page - 1) * limit;
  const entries = await db.leaderboardEntry.findMany({
    orderBy: { rating: 'desc' },
    skip,
    take: limit,
    include: {
      user: { select: { name: true, image: true } },
    },
  });

  return entries.map((entry, index) => mapEntry(entry, skip + index + 1));
};

export const getMyLeaderboardEntry = async (
  userId: string,
): Promise<LeaderboardEntryItem | null> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, rating: true },
  });

  if (!user) return null;

  const entry = await db.leaderboardEntry.upsert({
    where: { userId },
    create: {
      userId,
      rating: user.rating,
      wins: 0,
      losses: 0,
      totalMatches: 0,
      winStreak: 0,
      bestWinStreak: 0,
    },
    update: { rating: user.rating },
    include: { user: { select: { name: true, image: true } } },
  });

  const higherCount = await db.leaderboardEntry.count({
    where: { rating: { gt: entry.rating } },
  });

  return mapEntry(entry, higherCount + 1);
};
