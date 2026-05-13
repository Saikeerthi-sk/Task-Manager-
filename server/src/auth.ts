import jwt from 'jsonwebtoken';
import { env } from './env';

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  typ?: 'access';
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign({ ...payload, typ: 'access' }, env.JWT_SECRET, {
    expiresIn: Math.floor(env.JWT_ACCESS_MS / 1000),
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload & { typ?: string };
  if (decoded.typ && decoded.typ !== 'access') {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return decoded;
}
