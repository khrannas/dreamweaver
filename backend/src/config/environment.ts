import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  OPENROUTER_API_KEY: string;
  BACKEND_URL: string;
  SENTRY_DSN: string | undefined;
}

export const environment: Environment = {
  NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  SENTRY_DSN: process.env.SENTRY_DSN,
};

// Validation
export const validateEnvironment = (): void => {
  // In development, allow missing API key (will use fallback mode)
  if (environment.NODE_ENV === 'development') {
    return;
  }

  // In production, require all necessary variables
  const requiredVars = ['OPENROUTER_API_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
