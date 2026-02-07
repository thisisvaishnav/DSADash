import { Router } from 'express';
import { requireAuth } from '../auth/auth.controller';
import {
  handleGetMatchHistory,
  handleGetMatchById,
  handleGetStats,
} from './match.controller';

const matchRouter = Router();

// ─── Protected Match Endpoints ──────────────────────────────────────
matchRouter.get('/api/matches', requireAuth, handleGetMatchHistory);
matchRouter.get('/api/matches/stats', requireAuth, handleGetStats);
matchRouter.get('/api/matches/:matchId', requireAuth, handleGetMatchById);

export { matchRouter };
