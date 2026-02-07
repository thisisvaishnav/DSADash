import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Define schema for type safety
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SERVER_PORT: z.string().transform(Number).default('4000'),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // Auth
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
  
  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Client
  CLIENT_URL: z.string().default('http://localhost:3000'),
  
  // Match Config
  MATCH_DURATION_MINUTES: z.string().transform(Number).default('15'),
  MATCH_QUESTIONS_COUNT: z.string().transform(Number).default('5'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:');
    console.error(error);
    process.exit(1);
  }
};

export const env = parseEnv();

// Export commonly used values
export const {
  NODE_ENV,
  SERVER_PORT,
  DATABASE_URL,
  REDIS_URL,
  CLIENT_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  MATCH_DURATION_MINUTES,
  MATCH_QUESTIONS_COUNT,
} = env;

export const isDevelopment = NODE_ENV === 'development';
export const isProduction = NODE_ENV === 'production';
export const isTest = NODE_ENV === 'test';