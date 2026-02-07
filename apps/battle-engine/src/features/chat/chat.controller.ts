import { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { getConversation, sendMessage } from './chat.service';

const messageSchema = z.object({
  content: z.string().min(1, 'content is required'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const userIdParamSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export const handleSendMessage = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsedBody = messageSchema.safeParse(req.body);
  const parsedParams = userIdParamSchema.safeParse(req.params);

  if (!parsedBody.success || !parsedParams.success) {
    res.status(400).json({
      success: false,
      error: parsedBody.success ? parsedParams.error.flatten() : parsedBody.error.flatten(),
    });
    return;
  }

  const data = await sendMessage(authReq.user.id, parsedParams.data.userId, parsedBody.data.content);
  res.json({ success: true, data });
};

export const handleGetConversation = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const parsedParams = userIdParamSchema.safeParse(req.params);
  const parsedQuery = paginationSchema.safeParse(req.query);

  if (!parsedParams.success || !parsedQuery.success) {
    res.status(400).json({
      success: false,
      error: parsedParams.success ? parsedQuery.error.flatten() : parsedParams.error.flatten(),
    });
    return;
  }

  const data = await getConversation(
    authReq.user.id,
    parsedParams.data.userId,
    parsedQuery.data.page,
    parsedQuery.data.limit,
  );

  res.json({ success: true, data });
};
