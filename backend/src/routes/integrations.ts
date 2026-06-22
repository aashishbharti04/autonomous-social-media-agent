import { Router } from 'express';
import { z } from 'zod';
import { decryptSecret, encryptSecret, maskSecret } from '../auth/crypto.js';
import { requireAuth } from '../auth/middleware.js';
import { store } from '../db/index.js';
import type { ApiIntegration, IntegrationView } from '../types.js';

export const integrationsRouter = Router();
integrationsRouter.use(requireAuth);

const addSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'openai-compatible']),
  label: z.string().min(1, 'Label is required'),
  apiKey: z.string().min(8, 'API key looks too short'),
  model: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

function view(i: ApiIntegration): IntegrationView {
  return {
    id: i.id,
    kind: i.kind,
    provider: i.provider,
    label: i.label,
    model: i.model,
    baseUrl: i.baseUrl,
    active: i.active,
    keyMasked: maskSecret(decryptSecret(i.secretEnc)),
    createdAt: i.createdAt,
  };
}

integrationsRouter.get('/', async (req, res, next) => {
  try {
    const items = await store.listIntegrations(req.userId!);
    res.json({ ok: true, data: items.map(view) });
  } catch (err) {
    next(err);
  }
});

integrationsRouter.post('/', async (req, res, next) => {
  try {
    const input = addSchema.parse(req.body);
    if (input.provider === 'openai-compatible' && !input.baseUrl) {
      return res
        .status(400)
        .json({ ok: false, error: 'baseUrl is required for openai-compatible providers' });
    }
    const created = await store.addIntegration({
      userId: req.userId!,
      kind: 'llm',
      provider: input.provider,
      label: input.label,
      model: input.model,
      baseUrl: input.baseUrl,
      secretEnc: encryptSecret(input.apiKey),
    });
    res.status(201).json({ ok: true, data: view(created) });
  } catch (err) {
    next(err);
  }
});

integrationsRouter.post('/:id/activate', async (req, res, next) => {
  try {
    const ok = await store.setActiveIntegration(req.userId!, 'llm', req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Integration not found' });
    res.json({ ok: true, data: { active: req.params.id } });
  } catch (err) {
    next(err);
  }
});

integrationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const ok = await store.deleteIntegration(req.userId!, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Integration not found' });
    res.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});
