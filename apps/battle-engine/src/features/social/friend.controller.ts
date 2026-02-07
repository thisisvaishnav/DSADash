import { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../auth/auth.types';
import {
  acceptFriendRequest,
  createFriendRequest,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
} from './friend.service';

const createRequestSchema = z.object({
  addresseeId: z.string().min(1, 'addresseeId is required'),
});

const requestIdSchema = z.object({
  requestId: z.string().min(1, 'requestId is required'),
});

export const handleCreateFriendRequest = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsed = createRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const result = await createFriendRequest(authReq.user.id, parsed.data.addresseeId);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true, data: result.data });
};

export const handleAcceptFriendRequest = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsed = requestIdSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const result = await acceptFriendRequest(parsed.data.requestId, authReq.user.id);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true, data: result.data });
};

export const handleRejectFriendRequest = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsed = requestIdSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const result = await rejectFriendRequest(parsed.data.requestId, authReq.user.id);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true, data: result.data });
};

export const handleGetFriendRequests = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const data = await getFriendRequests(authReq.user.id);
  res.json({ success: true, data });
};

export const handleGetFriends = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const data = await getFriends(authReq.user.id);
  res.json({ success: true, data });
};
