import { Request, Response } from 'express';
import { matchHistoryQuerySchema, matchIdParamSchema } from './match.validator';
import { getMatchHistory, getMatchById, getActiveMatchCount } from './match.service';
import { getQueueSize } from './matchmaker.service';
import type { AuthenticatedRequest } from '../auth/auth.types';

// ─── Get Match History ──────────────────────────────────────────────
export const handleGetMatchHistory = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsed = matchHistoryQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { page, limit } = parsed.data;
  const history = await getMatchHistory(authReq.user.id, page, limit);

  res.json({ success: true, data: history });
};

// ─── Get Single Match ───────────────────────────────────────────────
export const handleGetMatchById = async (req: Request, res: Response): Promise<void> => {
  const parsed = matchIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const match = await getMatchById(parsed.data.matchId);

  if (!match) {
    res.status(404).json({ success: false, error: 'Match not found' });
    return;
  }

  res.json({ success: true, data: match });
};

// ─── Get Server Stats (queue size, active matches) ──────────────────
export const handleGetStats = async (_req: Request, res: Response): Promise<void> => {
  const [queueSize, activeMatches] = await Promise.all([
    getQueueSize(),
    Promise.resolve(getActiveMatchCount()),
  ]);

  res.json({
    success: true,
    data: { queueSize, activeMatches },
  });
};
