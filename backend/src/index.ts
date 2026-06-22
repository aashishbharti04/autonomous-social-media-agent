import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';
import { appMode, config, paths } from './config.js';
import { api } from './routes/api.js';

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded media (data/uploads → /uploads/<file>).
app.use('/uploads', express.static(paths.uploadsDir));

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
    // Multer (upload) errors and our own validation throws are client errors.
    const name = (err as { name?: string })?.name;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (name === 'MulterError' || /allowed|not found|paused/i.test(message)) {
      return res.status(400).json({ ok: false, error: message });
    }
    res.status(500).json({ ok: false, error: message });
  },
);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `🤖 Autonomous Social Media Agent API listening on http://localhost:${config.port} [mode: ${appMode()}]`,
  );
});
