import { Router } from 'express';
import { z } from 'zod';
import {
  hashPassword,
  signPurposeToken,
  signToken,
  toSafeUser,
  verifyPassword,
  verifyPurposeToken,
} from '../auth/auth.js';
import { requireAuth } from '../auth/middleware.js';
import { config } from '../config.js';
import { store } from '../db/index.js';
import { resetEmail, sendEmail, verificationEmail } from '../services/email.js';
import type { User } from '../types.js';

export const authRouter = Router();

/** Fire-and-forget a verification email with a 1-day signed link. */
async function sendVerification(user: User): Promise<void> {
  const token = signPurposeToken(user.id, 'verify', '1d');
  const link = `${config.appBaseUrl}/verify?token=${encodeURIComponent(token)}`;
  await sendEmail(verificationEmail(user.email, link));
}

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await store.getUserByEmail(input.email);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'An account with that email already exists' });
    }
    const user = await store.createUser({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    const token = signToken(user.id);
    void sendVerification(user).catch(() => {}); // best-effort, non-blocking
    res.status(201).json({ ok: true, data: { token, user: toSafeUser(user) } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await store.getUserByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }
    const token = signToken(user.id);
    res.json({ ok: true, data: { token, user: toSafeUser(user) } });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await store.getUserById(req.userId!);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    res.json({ ok: true, data: { user: toSafeUser(user) } });
  } catch (err) {
    next(err);
  }
});

// ---- Email verification ----

authRouter.post('/verify', async (req, res, next) => {
  try {
    const token = z.object({ token: z.string().min(1) }).parse(req.body).token;
    const userId = verifyPurposeToken(token, 'verify');
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired verification link' });
    }
    await store.setEmailVerified(userId);
    res.json({ ok: true, data: { verified: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/request-verification', requireAuth, async (req, res, next) => {
  try {
    const user = await store.getUserById(req.userId!);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    if (!user.emailVerified) await sendVerification(user);
    res.json({ ok: true, data: { sent: true } });
  } catch (err) {
    next(err);
  }
});

// ---- Password reset ----

authRouter.post('/forgot', async (req, res, next) => {
  try {
    const email = z.object({ email: z.string().email() }).parse(req.body).email;
    const user = await store.getUserByEmail(email);
    if (user) {
      const token = signPurposeToken(user.id, 'reset', '1h');
      const link = `${config.appBaseUrl}/reset?token=${encodeURIComponent(token)}`;
      await sendEmail(resetEmail(user.email, link));
    }
    // Always succeed — don't reveal whether an email is registered.
    res.json({ ok: true, data: { sent: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset', async (req, res, next) => {
  try {
    const input = z
      .object({ token: z.string().min(1), password: z.string().min(6) })
      .parse(req.body);
    const userId = verifyPurposeToken(input.token, 'reset');
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired reset link' });
    }
    await store.updatePassword(userId, await hashPassword(input.password));
    res.json({ ok: true, data: { reset: true } });
  } catch (err) {
    next(err);
  }
});
