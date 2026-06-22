import { Router } from 'express';
import { z } from 'zod';
import { accountStore } from '../store/accounts.js';
import { PLATFORMS } from '../types.js';

export const accountsRouter = Router();

const connectSchema = z.object({
  platform: z.enum(PLATFORMS as [string, ...string[]]),
  handle: z.string().min(1, 'handle is required'),
  label: z.string().min(1, 'label is required'),
  accessToken: z.string().optional(),
});

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
  active: z.boolean().optional(),
  accessToken: z.string().optional(),
});

accountsRouter.get('/', (_req, res) => {
  res.json({ ok: true, data: accountStore.list() });
});

accountsRouter.post('/', (req, res, next) => {
  try {
    const input = connectSchema.parse(req.body);
    res.status(201).json({ ok: true, data: accountStore.connect(input as never) });
  } catch (err) {
    next(err);
  }
});

accountsRouter.patch('/:id', (req, res, next) => {
  try {
    const patch = updateSchema.parse(req.body);
    const updated = accountStore.update(req.params.id, patch);
    if (!updated) return res.status(404).json({ ok: false, error: 'Account not found' });
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

accountsRouter.delete('/:id', (req, res) => {
  const ok = accountStore.remove(req.params.id);
  if (!ok) return res.status(404).json({ ok: false, error: 'Account not found' });
  res.json({ ok: true, data: { deleted: true } });
});
