import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback!;
}

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '3000'), 10),
  APP_NAME: getEnv('APP_NAME', 'KostKita'),
  APP_URL: getEnv('APP_URL', 'http://localhost:3000'),
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173'),
  ADMIN_URL: getEnv('ADMIN_URL', 'http://localhost:5174'),

  DATABASE_URL: getEnv('DATABASE_URL'),

  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),

  BCRYPT_SALT_ROUNDS: parseInt(getEnv('BCRYPT_SALT_ROUNDS', '12'), 10),

  CLOUDINARY_CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: getEnv('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: getEnv('CLOUDINARY_API_SECRET', ''),

  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET', ''),

  RATE_LIMIT_WINDOW_MS: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(getEnv('RATE_LIMIT_MAX', '100'), 10),
  AUTH_RATE_LIMIT_MAX: parseInt(getEnv('AUTH_RATE_LIMIT_MAX', '10'), 10),

  ALLOWED_ORIGINS: getEnv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174').split(','),

  isDev: () => env.NODE_ENV === 'development',
  isProd: () => env.NODE_ENV === 'production',
};
