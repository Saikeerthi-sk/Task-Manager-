import crypto from 'crypto';
import type { Express } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prisma';
import { asyncHandler, requireAuth, type AuthedRequest } from '../middleware';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from '../validators';
import { createSessionAndSetCookies, revokeRefreshByRawToken, rotateAccessFromRefreshCookie } from '../sessions';
import { clearAuthCookies, COOKIE_REFRESH } from '../cookies';
import { sendPasswordResetEmail } from '../mail';
import { env } from '../env';

const BCRYPT_ROUNDS = 12;

/** Limit account creation per IP (abuse / spam). */
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many signup attempts, try again later.',
});

/** Credential stuffing protection — counts failed attempts only when skipSuccessfulRequests is true. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, try again later.',
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password reset requests, try again later.',
});

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many reset attempts, try again later.',
});

function hashResetToken(raw: string) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

const forgotPasswordResponse = {
  message: 'If an account exists for this email, password reset instructions have been sent.',
};

type ForgotPasswordJson = typeof forgotPasswordResponse & {
  /** In-app path when email was not sent (e.g. local / misconfigured provider). Never includes host. */
  resetPath?: string;
  /** True when an email was handed off to Resend successfully. */
  emailDispatched?: boolean;
};

export function registerAuthRoutes(app: Express) {
  app.post(
    '/api/auth/signup',
    signupLimiter,
    asyncHandler(async (req, res) => {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const name = parsed.data.name.trim();
      const email = parsed.data.email.trim().toLowerCase();
      const password = parsed.data.password;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: { id: true, email: true, name: true },
      });

      await createSessionAndSetCookies(res, user);
      return res.status(201).json({ user });
    }),
  );

  app.post(
    '/api/auth/login',
    loginLimiter,
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const email = parsed.data.email.trim().toLowerCase();
      const password = parsed.data.password;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      const safe = { id: user.id, email: user.email, name: user.name };
      await createSessionAndSetCookies(res, safe);
      return res.json({ user: safe });
    }),
  );

  app.post(
    '/api/auth/forgot-password',
    forgotPasswordLimiter,
    asyncHandler(async (req, res) => {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const email = parsed.data.email;
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });

      const payload: ForgotPasswordJson = { ...forgotPasswordResponse };

      if (user) {
        if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY?.trim()) {
          console.warn('[password-reset] RESEND_API_KEY is not set — cannot email reset link in production.');
        } else {
          await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

          const raw = crypto.randomBytes(32).toString('base64url');
          const tokenHash = hashResetToken(raw);
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

          await prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
          });

          const base = env.WEB_ORIGIN.trim().replace(/\/$/, '');
          const resetUrl = `${base}/reset-password?token=${encodeURIComponent(raw)}`;
          const resetPath = `/reset-password?token=${encodeURIComponent(raw)}`;

          const sendResult = await sendPasswordResetEmail(user.email, resetUrl);

          if (sendResult.ok) {
            if (sendResult.channel === 'resend') {
              payload.emailDispatched = true;
            } else {
              payload.emailDispatched = false;
              if (env.NODE_ENV !== 'production') {
                payload.resetPath = resetPath;
              }
            }
          } else {
            if (env.NODE_ENV === 'production') {
              await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
              return res.status(503).json({
                error:
                  'We could not send a reset email right now. Please try again in a few minutes or contact support if this continues.',
              });
            }
            payload.emailDispatched = false;
            payload.resetPath = resetPath;
          }
        }
      }

      return res.json(payload);
    }),
  );

  app.post(
    '/api/auth/reset-password',
    resetPasswordLimiter,
    asyncHandler(async (req, res) => {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const tokenHash = hashResetToken(parsed.data.token);
      const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

      if (!row || row.usedAt || row.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired reset link. Request a new reset email.' });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

      const user = await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.update({
          where: { id: row.id },
          data: { usedAt: new Date() },
        });
        await tx.refreshSession.deleteMany({ where: { userId: row.userId } });
        return tx.user.update({
          where: { id: row.userId },
          data: { passwordHash },
          select: { id: true, email: true, name: true },
        });
      });

      const safe = { id: user.id, email: user.email, name: user.name };
      await createSessionAndSetCookies(res, safe);
      return res.json({ user: safe, message: 'Password updated. You are now signed in.' });
    }),
  );

  app.post(
    '/api/auth/logout',
    asyncHandler(async (req, res) => {
      const raw = req.cookies?.[COOKIE_REFRESH] as string | undefined;
      await revokeRefreshByRawToken(raw);
      clearAuthCookies(res);
      return res.status(204).send();
    }),
  );

  app.post(
    '/api/auth/refresh',
    asyncHandler(async (req, res) => {
      const raw = req.cookies?.[COOKIE_REFRESH] as string | undefined;
      const result = await rotateAccessFromRefreshCookie(res, raw);
      if (!result.ok) {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Session expired', code: 'REFRESH_INVALID' });
      }
      return res.json({ user: result.user });
    }),
  );

  const meHandler = asyncHandler(async (req: AuthedRequest, res) => {
    return res.json({ user: req.user });
  });

  app.get('/api/auth/me', requireAuth, meHandler);
  app.get('/api/me', requireAuth, meHandler);
}
