import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, signToken, toSafeUser, verifyPassword } from '../auth/auth.js';
import { requireAuth } from '../auth/middleware.js';
import { store } from '../db/index.js';

export const authRouter = Router();

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
