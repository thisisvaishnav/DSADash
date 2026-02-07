import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { auth } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

// ─── Better Auth API Handler ─────────────────────────────────────────
// Forwards all /api/auth/* requests to Better Auth's built-in handler
export const handleAuthRequest = toNodeHandler(auth);

// ─── Get Current Session ─────────────────────────────────────────────
export const handleGetSession = async (req: Request, res: Response): Promise<void> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  res.json({ success: true, data: session });
};

// ─── Auth Middleware (protect routes) ────────────────────────────────
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  (req as AuthenticatedRequest).user = session.user as AuthenticatedRequest['user'];
  (req as AuthenticatedRequest).session = session.session as AuthenticatedRequest['session'];
  next();
};
