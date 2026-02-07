import { Request } from 'express';

// ─── Session User (attached after auth middleware verifies) ───────────
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  rating: number;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Session object returned by Better Auth ──────────────────────────
export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

// ─── Authenticated request (after requireAuth middleware) ─────────────
export type AuthenticatedRequest = Request & {
  user: AuthUser;
  session: AuthSession;
};

// ─── Auth error response ─────────────────────────────────────────────
export type AuthErrorResponse = {
  success: false;
  error: string;
  code?: string;
};

// ─── Auth success response ───────────────────────────────────────────
export type AuthSuccessResponse<T = unknown> = {
  success: true;
  data: T;
};
