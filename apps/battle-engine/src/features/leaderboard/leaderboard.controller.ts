import { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { getLeaderboard, getMyLeaderboardEntry } from './leaderboard.service';

const leaderboardQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const handleGetLeaderboard = async (req: Request, res: Response): Promise<void> => {
  const parsed = leaderboardQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const data = await getLeaderboard(parsed.data.page, parsed.data.limit);
  res.json({ success: true, data });
};

export const handleGetMyLeaderboardEntry = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const entry = await getMyLeaderboardEntry(authReq.user.id);

  if (!entry) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: entry });
};
