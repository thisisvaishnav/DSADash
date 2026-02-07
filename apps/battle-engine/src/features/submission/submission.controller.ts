import { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../auth/auth.types';
import {
  applySubmissionResult,
  createSubmission,
  getMatchSubmissions,
  getUserSubmissions,
} from './submission.service';
import type { SubmissionStatus } from './submission.types';

const createSubmissionSchema = z.object({
  matchId: z.string().min(1, 'matchId is required'),
  questionId: z.number().int().positive('questionId must be a positive integer'),
  code: z.string().min(1, 'code is required'),
  language: z.string().min(1, 'language is required'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const matchIdParamSchema = z.object({
  matchId: z.string().min(1, 'matchId is required'),
});

const submissionResultSchema = z.object({
  matchId: z.string().min(1, 'matchId is required'),
  userId: z.string().min(1, 'userId is required'),
  questionId: z.number().int().positive('questionId must be a positive integer'),
  testsPassed: z.number().int().nonnegative(),
  totalTests: z.number().int().positive(),
  status: z.enum(['pending', 'passed', 'failed', 'error']).optional(),
});

export const handleCreateSubmission = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsed = createSubmissionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const submission = await createSubmission(authReq.user.id, parsed.data);

  res.json({
    success: true,
    data: {
      id: submission.id,
      questionId: submission.questionId,
      status: submission.status as SubmissionStatus,
      createdAt: submission.createdAt.toISOString(),
    },
  });
};

export const handleGetMySubmissions = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsed = paginationSchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const submissions = await getUserSubmissions(authReq.user.id, parsed.data.page, parsed.data.limit);
  res.json({ success: true, data: submissions });
};

export const handleGetMatchSubmissions = async (req: Request, res: Response): Promise<void> => {
  const parsed = matchIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const submissions = await getMatchSubmissions(parsed.data.matchId);
  res.json({ success: true, data: submissions });
};

export const handleSubmissionResult = async (req: Request, res: Response): Promise<void> => {
  const parsed = submissionResultSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const result = await applySubmissionResult(parsed.data);
  if (!result) {
    res.status(404).json({ success: false, error: 'Submission not found' });
    return;
  }

  res.json({ success: true, data: result });
};
