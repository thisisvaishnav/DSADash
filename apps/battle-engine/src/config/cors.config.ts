import { CorsOptions } from 'cors';
import { CLIENT_URL, isProduction } from './env.config';

export const corsConfig: CorsOptions = {
  origin: isProduction 
    ? [CLIENT_URL, 'https://www.DSADash.fun']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};
