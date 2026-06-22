import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';
import { appMode, config } from './config.js';
import { api } from './routes/api.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', api);

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    data: {
      name: 'Autonomous Social Media Agent API',
      mode: appMode(),
      docs: '/api/health, /api/agents, /api/campaign/run, /api/analytics/summary',
    },
  });
});

// Centralized error handler — turns validation/runtime errors into the envelope.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ ok: false, error: err.issues.map((i) => i.message).join('; ') });
    }
    const message = err instanceof Error ? err.message : 'Internal error';
    res.status(500).json({ ok: false, error: message });
  },
);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `🤖 Autonomous Social Media Agent API listening on http://localhost:${config.port} [mode: ${appMode()}]`,
  );
});
