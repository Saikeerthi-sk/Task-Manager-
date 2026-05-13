import type { CookieOptions, Response } from 'express';
import { env } from './env';

export const COOKIE_ACCESS = 'ttm_access';
export const COOKIE_REFRESH = 'ttm_refresh';

function baseCookieOptions(): CookieOptions {
  const secure = env.COOKIE_SECURE;
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
  };
}

/** Sent on all `/api/*` requests (API + static health is /api/health). */
export function setAccessTokenCookie(res: Response, accessToken: string) {
  res.cookie(COOKIE_ACCESS, accessToken, {
    ...baseCookieOptions(),
    path: '/api',
    maxAge: env.JWT_ACCESS_MS,
  });
}

/** Sent only to auth refresh/logout/signup/login routes under `/api/auth`. */
export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(COOKIE_REFRESH, refreshToken, {
    ...baseCookieOptions(),
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_MS,
  });
}

export function clearAuthCookies(res: Response) {
  const opts = { ...baseCookieOptions(), path: '/api' };
  const optsAuth = { ...baseCookieOptions(), path: '/api/auth' };
  res.clearCookie(COOKIE_ACCESS, opts);
  res.clearCookie(COOKIE_REFRESH, optsAuth);
}
