import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { store } from '../db/index.js';
import { PLATFORMS, type AccountView, type ConnectedAccount } from '../types.js';

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

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

/** Public view of an account — token redacted. */
function view(a: ConnectedAccount): AccountView {
  const connected = a.accessToken.length > 0;
  return {
    id: a.id,
    platform: a.platform,
    handle: a.handle,
    label: a.label,
    active: a.active,
    connected,
    tokenMasked: connected ? `••••••${a.accessToken.slice(-2)}` : 'demo (mock)',
    createdAt: a.createdAt,
  };
}

accountsRouter.get('/', async (req, res, next) => {
  try {
    const accounts = await store.listAccounts(req.userId!);
    res.json({ ok: true, data: accounts.map(view) });
  } catch (err) {
    next(err);
  }
});

accountsRouter.post('/', async (req, res, next) => {
  try {
    const input = connectSchema.parse(req.body);
    const account = await store.createAccount({
      userId: req.userId!,
      platform: input.platform as ConnectedAccount['platform'],
      handle: input.handle.startsWith('@') ? input.handle : `@${input.handle}`,
      label: input.label,
      accessToken: input.accessToken ?? '',
    });
    res.status(201).json({ ok: true, data: view(account) });
  } catch (err) {
    next(err);
  }
});

accountsRouter.patch('/:id', async (req, res, next) => {
  try {
    const patch = updateSchema.parse(req.body);
    const updated = await store.updateAccount(req.userId!, req.params.id, patch);
    if (!updated) return res.status(404).json({ ok: false, error: 'Account not found' });
    res.json({ ok: true, data: view(updated) });
  } catch (err) {
    next(err);
  }
});

accountsRouter.delete('/:id', async (req, res, next) => {
  try {
    const ok = await store.deleteAccount(req.userId!, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Account not found' });
    res.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});
