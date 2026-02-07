import { z } from 'zod';

// ─── Socket Event Validators ────────────────────────────────────────

export const joinQueueSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export const leaveQueueSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export const submitCodeSchema = z.object({
  matchId: z.string().min(1, 'matchId is required'),
  questionId: z.number().int().positive('questionId must be a positive integer'),
  code: z.string().min(1, 'code is required'),
  language: z.string().min(1, 'language is required'),
});

export const readySchema = z.object({
  matchId: z.string().min(1, 'matchId is required'),
  userId: z.string().min(1, 'userId is required'),
});

// ─── REST Query Validators ──────────────────────────────────────────

export const matchHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const matchIdParamSchema = z.object({
  matchId: z.string().min(1, 'matchId is required'),
});

// ─── Inferred Types ─────────────────────────────────────────────────

export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
export type LeaveQueueInput = z.infer<typeof leaveQueueSchema>;
export type SubmitCodeInput = z.infer<typeof submitCodeSchema>;
export type ReadyInput = z.infer<typeof readySchema>;
export type MatchHistoryQuery = z.infer<typeof matchHistoryQuerySchema>;
