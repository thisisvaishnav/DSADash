import { Router } from 'express';
import { handleAuthRequest, handleGetSession, requireAuth } from './auth.controller';

const authRouter = Router();

// ─── Better Auth catch-all (sign-up, sign-in, OAuth, etc.) ──────────
// All requests to /api/auth/* are forwarded to Better Auth's handler
authRouter.all('/api/auth/*splat', handleAuthRequest);

// ─── Custom endpoints ───────────────────────────────────────────────
authRouter.get('/api/me', requireAuth, handleGetSession);

export { authRouter };
