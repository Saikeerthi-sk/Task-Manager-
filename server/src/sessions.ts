import crypto from 'crypto';
import type { Response } from 'express';
import { prisma } from './prisma';
import { env } from './env';
import { signAccessToken } from './auth';
import { setAccessTokenCookie, setRefreshTokenCookie } from './cookies';

export function hashRefreshToken(raw: string) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export async function createSessionAndSetCookies(
  res: Response,
  user: { id: string; email: string; name: string },
) {
  const rawRefresh = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashRefreshToken(rawRefresh);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_MS);

  await prisma.refreshSession.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, rawRefresh);
}

export async function revokeRefreshByRawToken(rawRefresh: string | undefined) {
  if (!rawRefresh) return;
  const tokenHash = hashRefreshToken(rawRefresh);
  await prisma.refreshSession.deleteMany({ where: { tokenHash } });
}

export async function rotateAccessFromRefreshCookie(
  res: Response,
  rawRefresh: string | undefined,
): Promise<{ ok: true; user: { id: string; email: string; name: string } } | { ok: false; reason: string }> {
  if (!rawRefresh) return { ok: false, reason: 'missing_refresh' };
  const tokenHash = hashRefreshToken(rawRefresh);
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.refreshSession.delete({ where: { id: session.id } });
    return { ok: false, reason: 'invalid_or_expired' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    await prisma.refreshSession.delete({ where: { id: session.id } });
    return { ok: false, reason: 'user_missing' };
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  setAccessTokenCookie(res, accessToken);
  return { ok: true, user };
}
