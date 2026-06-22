import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { config, paths } from '../config.js';
import { generateImage } from '../services/image.js';
import { mediaStore } from '../store/media.js';
import { PLATFORMS } from '../types.js';

export const mediaRouter = Router();

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

mediaRouter.get('/', (_req, res) => {
  res.json({ ok: true, data: mediaStore.list() });
});

mediaRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded (field: file)' });
  const asset = mediaStore.add({
    url: `${config.publicBaseUrl}/uploads/${req.file.filename}`,
    filePath: req.file.path,
    source: 'upload',
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
  });
  res.status(201).json({ ok: true, data: asset });
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
      },
      input.prompt,
    );
    const asset = mediaStore.add({
      url,
      source: 'generated',
      mimeType: 'image/jpeg',
      sizeBytes: 0,
      prompt: input.prompt,
    });
    res.status(201).json({ ok: true, data: asset });
  } catch (err) {
    next(err);
  }
});

mediaRouter.delete('/:id', (req, res) => {
  const ok = mediaStore.remove(req.params.id);
  if (!ok) return res.status(404).json({ ok: false, error: 'Asset not found' });
  res.json({ ok: true, data: { deleted: true } });
});
