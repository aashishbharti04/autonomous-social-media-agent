import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { SafeUser, User } from '../types.js';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

type Purpose = 'verify' | 'reset';

/** Signed, expiring token for email verification / password reset links. */
export function signPurposeToken(userId: string, purpose: Purpose, expiresIn: string): string {
  return jwt.sign({ sub: userId, purpose }, config.auth.jwtSecret, {
    expiresIn,
  } as jwt.SignOptions);
}

/** Returns the userId if the token is valid AND matches the expected purpose. */
export function verifyPurposeToken(token: string, purpose: Purpose): string | null {
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as { sub?: string; purpose?: string };
    if (payload.purpose !== purpose) return null;
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Strip the password hash before returning a user to clients. */
export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}
