import path from 'path';
import dotenv from 'dotenv';

// Always load `server/.env` (works when npm runs from repo root or from `server/`)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV ?? 'development';

function num(v: string | undefined, fallback: number) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const JWT_ACCESS_MINUTES = num(process.env.JWT_ACCESS_MINUTES, 15);
const REFRESH_TOKEN_DAYS = num(process.env.REFRESH_TOKEN_DAYS, 14);

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  NODE_ENV,
  /** Behind Railway / reverse proxy — enables correct client IP for rate limiting. */
  TRUST_PROXY: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  JWT_ACCESS_MS: JWT_ACCESS_MINUTES * 60 * 1000,
  REFRESH_TOKEN_MS: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  /** Secure cookies in production (HTTPS). */
  COOKIE_SECURE: NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
  /** Resend API key for transactional email (password reset). Optional — without it, reset links are logged server-side in development. */
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  /** From address for Resend (e.g. `Team App <noreply@yourdomain.com>`). */
  EMAIL_FROM: process.env.EMAIL_FROM ?? '',
};

export function assertEnv() {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  if (missing.length) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. ` +
        `Create server/.env (see server/.env.example) with DATABASE_URL and JWT_SECRET, then restart the server.`,
    );
  }
}
