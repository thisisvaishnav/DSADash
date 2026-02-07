import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '../../core/database/db.client';
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  CLIENT_URL,
} from '../../config/env.config';

// ─── Better Auth Instance ────────────────────────────────────────────
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [CLIENT_URL],

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      rating: {
        type: 'number',
        defaultValue: 1200,
      },
    },
  },
});

// ─── Export type helper for use across the app ───────────────────────
export type Auth = typeof auth;
