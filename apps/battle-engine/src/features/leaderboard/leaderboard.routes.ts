import { Router } from 'express';
import { requireAuth } from '../auth/auth.controller';
import {
  handleGetLeaderboard,
  handleGetMyLeaderboardEntry,
} from './leaderboard.controller';

const leaderboardRouter = Router();

leaderboardRouter.get('/api/leaderboard', handleGetLeaderboard);
leaderboardRouter.get('/api/leaderboard/me', requireAuth, handleGetMyLeaderboardEntry);

export { leaderboardRouter };
