import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from './auth';
import { prisma } from './prisma';
import type { ProjectRole } from './constants';
import { COOKIE_ACCESS } from './cookies';

export type AuthedRequest = Request & { user?: { id: string; email: string; name: string } };

function extractAccessToken(req: Request): string | null {
  const header = req.header('authorization') ?? '';
  if (header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim() || null;
  const c = (req as any).cookies?.[COOKIE_ACCESS];
  return typeof c === 'string' && c.length > 0 ? c : null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Access token expired', code: 'ACCESS_EXPIRED' });
    }
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}

export function asyncHandler<T extends (req: any, res: any, next: any) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function getProjectRoleOrNull(userId: string, projectId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export function requireProjectRole(allowed: ProjectRole[]) {
  return asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const projectId = req.params.projectId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!projectId) return res.status(400).json({ error: 'Missing projectId' });

    const role = await getProjectRoleOrNull(userId, projectId);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    if (!allowed.includes(role)) return res.status(403).json({ error: 'Forbidden' });

    (req as any).projectRole = role;
    next();
  });
}
