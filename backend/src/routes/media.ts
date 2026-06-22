import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { config, paths } from '../config.js';
import { store } from '../db/index.js';
import { generateImage } from '../services/image.js';
import { PLATFORMS } from '../types.js';

export const mediaRouter = Router();
mediaRouter.use(requireAuth);

fs.mkdirSync(paths.uploadsDir, { recursive: true });

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paths.uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${uuid()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPEG, WEBP or GIF images are allowed'));
  },
});

/** Strip the on-disk path before returning an asset. */
function publicView<T extends { filePath?: string }>(a: T): Omit<T, 'filePath'> {
  const { filePath: _omit, ...rest } = a;
  return rest;
}

mediaRouter.get('/', async (req, res, next) => {
  try {
    const items = await store.listMedia(req.userId!);
    res.json({ ok: true, data: items.map(publicView) });
  } catch (err) {
    next(err);
  }
});

mediaRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded (field: file)' });
    const asset = await store.addMedia({
      userId: req.userId!,
      url: `${config.publicBaseUrl}/uploads/${req.file.filename}`,
      filePath: req.file.path,
      source: 'upload',
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    res.status(201).json({ ok: true, data: publicView(asset) });
  } catch (err) {
    next(err);
  }
});

const generateSchema = z.object({
  prompt: z.string().min(2),
  businessType: z.string().optional(),
  platform: z.enum(PLATFORMS as [string, ...string[]]).optional(),
});

mediaRouter.post('/generate', async (req, res, next) => {
  try {
    const input = generateSchema.parse(req.body);
    const url = await generateImage(
      {
        businessType: input.businessType ?? 'brand',
        goal: 'Brand Awareness',
        platform: (input.platform as never) ?? 'instagram',
        tone: 'professional',
        userId: req.userId!,
      },
      input.prompt,
    );
    const asset = await store.addMedia({
      userId: req.userId!,
      url,
      source: 'generated',
      mimeType: 'image/svg+xml',
      sizeBytes: 0,
      prompt: input.prompt,
    });
    res.status(201).json({ ok: true, data: publicView(asset) });
  } catch (err) {
    next(err);
  }
});

mediaRouter.delete('/:id', async (req, res, next) => {
  try {
    const asset = await store.deleteMedia(req.userId!, req.params.id);
    if (!asset) return res.status(404).json({ ok: false, error: 'Asset not found' });
    if (asset.filePath) {
      try {
        fs.rmSync(asset.filePath, { force: true });
      } catch {
        /* ignore */
      }
    }
    res.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});
