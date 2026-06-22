'use client';

import { useState } from 'react';
import {
  getIntegrations,
  addIntegration,
  activateIntegration,
  deleteIntegration,
  ApiError,
  type Integration,
  type IntegrationProvider,
} from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import { formatDate } from '../components/format';

const PROVIDERS: { value: IntegrationProvider; label: string; modelHint: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)', modelHint: 'claude-opus-4-8' },
  { value: 'openai', label: 'OpenAI', modelHint: 'gpt-4o-mini' },
  {
    value: 'openai-compatible',
    label: 'OpenAI-compatible (Groq, OpenRouter, Gemini, Mistral…)',
    modelHint: 'llama-3.3-70b-versatile',
  },
];

const BASE_URL_PRESETS = [
  ['Groq', 'https://api.groq.com/openai/v1'],
  ['OpenRouter', 'https://openrouter.ai/api/v1'],
  ['Google Gemini', 'https://generativelanguage.googleapis.com/v1beta/openai'],
  ['Mistral', 'https://api.mistral.ai/v1'],
];

export default function SettingsPage() {
  const { data, loading, error, reload } = useAsync(getIntegrations, []);

  const [provider, setProvider] = useState<IntegrationProvider>('openai-compatible');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isCompatible = provider === 'openai-compatible';
  const modelHint = PROVIDERS.find((p) => p.value === provider)?.modelHint ?? '';

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !apiKey.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await addIntegration({
        provider,
        label: label.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
        baseUrl: isCompatible ? baseUrl.trim() || undefined : undefined,
      });
      setLabel('');
      setApiKey('');
      setModel('');
      setBaseUrl('');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function onActivate(it: Integration) {
    setBusyId(it.id);
    setFormError(null);
    try {
      await activateIntegration(it.id);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(it: Integration) {
    if (!window.confirm(`Delete API key "${it.label}"?`)) return;
    setBusyId(it.id);
    setFormError(null);
    try {
      await deleteIntegration(it.id);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">API Keys</h2>
        <p className="mt-1 text-sm text-slate-400">
          Add your own AI provider key to generate real posts instead of templates. Free options
          include <strong>Groq</strong>, <strong>OpenRouter</strong>, <strong>Google Gemini</strong>{' '}
          and <strong>Mistral</strong> (all via &ldquo;OpenAI-compatible&rdquo;). Keys are encrypted
          at rest and never shown again.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px,1fr]">
        {/* Add-key form */}
        <Card title="Add a provider key">
          <form className="space-y-4" onSubmit={onAdd}>
            <div>
              <label className="label" htmlFor="provider">Provider</label>
              <select
                id="provider"
                className="input"
                value={provider}
                onChange={(e) => setProvider(e.target.value as IntegrationProvider)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="label">Label</label>
              <input
                id="label"
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. My Groq key"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="apiKey">API key</label>
              <input
                id="apiKey"
                className="input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your key"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="model">
                Model <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="model"
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={modelHint}
              />
            </div>

            {isCompatible && (
              <div>
                <label className="label" htmlFor="baseUrl">Base URL</label>
                <input
                  id="baseUrl"
                  className="input"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.groq.com/openai/v1"
                  required
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  {BASE_URL_PRESETS.map(([name, url]) => (
                    <button
                      key={url}
                      type="button"
                      className="rounded bg-slate-800/70 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
                      onClick={() => setBaseUrl(url)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formError && <p className="text-sm text-red-300">{formError}</p>}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={saving || !label.trim() || !apiKey.trim()}
            >
              {saving ? 'Saving…' : '🔑 Add key'}
            </button>
          </form>
        </Card>

        {/* Key list */}
        <div className="space-y-4">
          {loading && <Spinner label="Loading keys…" />}
          {error && <ErrorState message={error} onRetry={reload} />}

          {data && data.length === 0 && (
            <Card>
              <p className="text-sm text-slate-400">
                No API keys yet — add one above to enable real AI generation. Until then, the app
                uses smart templates (no key required).
              </p>
            </Card>
          )}

          {data && data.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.map((it) => {
                const busy = busyId === it.id;
                return (
                  <article key={it.id} className="card flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">{it.label}</p>
                        <p className="truncate text-xs text-slate-400">{it.provider}</p>
                      </div>
                      {it.active && <Badge tone="green">Active</Badge>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-slate-500">{it.keyMasked}</span>
                      {it.model && <Badge tone="slate">{it.model}</Badge>}
                    </div>
                    {it.baseUrl && (
                      <p className="truncate font-mono text-xs text-slate-500">{it.baseUrl}</p>
                    )}

                    <p className="text-xs text-slate-500">Added {formatDate(it.createdAt)}</p>

                    <div className="mt-auto flex items-center gap-2 border-t border-slate-800/80 pt-3">
                      <button
                        type="button"
                        className="btn-secondary flex-1"
                        disabled={busy || it.active}
                        onClick={() => onActivate(it)}
                      >
                        {it.active ? 'In use' : busy ? '…' : 'Set active'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary flex-1 text-red-300"
                        disabled={busy}
                        onClick={() => onDelete(it)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
