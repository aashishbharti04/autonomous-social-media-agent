import fs from 'node:fs';
import { v4 as uuid } from 'uuid';
import type { MediaAsset, MediaSource } from '../types.js';
import { JsonStore } from './json-store.js';

export interface AddMediaInput {
  url: string;
  source: MediaSource;
  mimeType: string;
  sizeBytes: number;
  filePath?: string;
  prompt?: string | null;
}

/**
 * Media library. Metadata persisted to data/media.json; uploaded files live
 * under data/uploads and are served statically at /uploads.
 */
class MediaStore {
  private store = new JsonStore<MediaAsset[]>('media.json', []);
  private assets: MediaAsset[] = this.store.read();

  list(): MediaAsset[] {
    return this.assets
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicView);
  }

  add(input: AddMediaInput): MediaAsset {
    const asset: MediaAsset = {
      id: uuid(),
      url: input.url,
      filePath: input.filePath,
      source: input.source,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      prompt: input.prompt ?? null,
      createdAt: new Date().toISOString(),
    };
    this.assets.push(asset);
    this.persist();
    return publicView(asset);
  }

  remove(id: string): boolean {
    const asset = this.assets.find((a) => a.id === id);
    if (!asset) return false;
    // Best-effort delete of the underlying upload.
    if (asset.filePath) {
      try {
        fs.rmSync(asset.filePath, { force: true });
      } catch {
        /* ignore */
      }
    }
    this.assets = this.assets.filter((a) => a.id !== id);
    this.persist();
    return true;
  }

  private persist(): void {
    this.store.write(this.assets);
  }
}

/** Strip the on-disk path from API responses. */
function publicView(a: MediaAsset): MediaAsset {
  const { filePath: _omit, ...rest } = a;
  return rest as MediaAsset;
}

export const mediaStore = new MediaStore();
