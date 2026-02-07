export type LeaderboardEntryItem = {
  userId: string;
  name: string;
  image: string | null;
  rating: number;
  rank: number;
  wins: number;
  losses: number;
  totalMatches: number;
  winStreak: number;
  bestWinStreak: number;
  lastMatchAt: string | null;
};

export type LeaderboardQuery = {
  page: number;
  limit: number;
};

export type LeaderboardMe = LeaderboardEntryItem;
