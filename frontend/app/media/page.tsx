'use client';

import { useRef, useState } from 'react';
import {
  getMedia,
  uploadMedia,
  generateMedia,
  deleteMedia,
  ApiError,
  PLATFORMS,
  type Platform,
  type MediaAsset,
} from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import { formatDate } from '../components/format';

export default function MediaPage() {
  const { data, loading, error, reload } = useAsync(getMedia, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // Generate form
  const [prompt, setPrompt] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [generating, setGenerating] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setActionError(null);
    try {
      await uploadMedia(file);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setActionError(null);
    try {
      await generateMedia({
        prompt: prompt.trim(),
        businessType: businessType.trim() || undefined,
        platform,
      });
      setPrompt('');
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setGenerating(false);
    }
  }

  async function onDelete(asset: MediaAsset) {
    if (!window.confirm('Delete this asset? This cannot be undone.')) return;
    setBusyId(asset.id);
    setActionError(null);
    try {
      await deleteMedia(asset.id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  const busy = uploading || generating;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
          Media Library
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload your own images or generate them with the Image agent, then attach them to
          posts from Compose.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload */}
        <Card title="Upload" subtitle="Add an image from your device (≤ 5 MB)">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={busy}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : '⬆ Choose image'}
          </button>
          {uploading && <Spinner className="mt-3" label="Uploading image…" />}
        </Card>

        {/* Generate */}
        <Card title="Generate" subtitle="Create an image from a text prompt">
          <form className="space-y-4" onSubmit={onGenerate}>
            <div>
              <label className="label" htmlFor="prompt">Prompt</label>
              <input
                id="prompt"
                className="input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. modern dental clinic, bright and clean"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="businessType">
                  Business type <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="businessType"
                  className="input"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g. Dental Clinic"
                />
              </div>
              <div>
                <label className="label" htmlFor="platform">Platform</label>
                <select
                  id="platform"
                  className="input capitalize"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !prompt.trim()}
            >
              {generating ? 'Generating…' : '✨ Generate image'}
            </button>
            {generating && <Spinner className="mt-1" label="Running the image agent…" />}
          </form>
        </Card>
      </div>

      {actionError && (
        <Card>
          <p className="text-sm font-medium text-red-300">Action failed</p>
          <p className="mt-1 text-sm text-slate-400">{actionError}</p>
        </Card>
      )}

      {loading && <Spinner label="Loading media…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400">
            No media yet. Upload an image or generate one to get started.
          </p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((asset) => {
            const cardBusy = busyId === asset.id;
            return (
              <article key={asset.id} className="card flex flex-col gap-3">
                <div className="overflow-hidden rounded-lg border border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.prompt || 'Media asset'}
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={asset.source === 'generated' ? 'indigo' : 'blue'}>
                    {asset.source}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {formatDate(asset.createdAt)}
                  </span>
                </div>
                {asset.prompt && (
                  <p className="line-clamp-2 text-xs text-slate-400">{asset.prompt}</p>
                )}
                <button
                  type="button"
                  className="btn-secondary mt-auto text-red-300"
                  disabled={cardBusy}
                  onClick={() => onDelete(asset)}
                >
                  {cardBusy ? 'Deleting…' : 'Delete'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
