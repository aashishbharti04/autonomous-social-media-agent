import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Requires a valid `Authorization: Bearer <jwt>` header. Sets req.userId.
 * Responds 401 otherwise.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ ok: false, error: 'Not authenticated' });
    return;
  }
  req.userId = userId;
  next();
}
