'use client';

import { useState } from 'react';
import {
  getAccounts,
  connectAccount,
  updateAccount,
  deleteAccount,
  ApiError,
  PLATFORMS,
  type Platform,
  type ConnectedAccount,
} from '@/lib/api';
import { useAsync } from '../components/useAsync';
import Card from '../components/Card';
import Badge, { toneForStatus } from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import { formatDate } from '../components/format';

export default function AccountsPage() {
  const { data, loading, error, reload } = useAsync(getAccounts, []);

  // Connect form
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [handle, setHandle] = useState('');
  const [label, setLabel] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Per-card mutation tracking
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim() || !label.trim()) return;
    setConnecting(true);
    setFormError(null);
    try {
      await connectAccount({
        platform,
        handle: handle.trim(),
        label: label.trim(),
        accessToken: accessToken.trim() || undefined,
      });
      setHandle('');
      setLabel('');
      setAccessToken('');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setConnecting(false);
    }
  }

  async function onToggle(account: ConnectedAccount) {
    setBusyId(account.id);
    setFormError(null);
    try {
      await updateAccount(account.id, { active: !account.active });
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  async function onDisconnect(account: ConnectedAccount) {
    if (!window.confirm(`Disconnect "${account.label}" (${account.handle})?`)) return;
    setBusyId(account.id);
    setFormError(null);
    try {
      await deleteAccount(account.id);
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
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
          Connected Accounts
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Connect a client&apos;s social account to automate it. Leaving the access token
          blank connects in demo (mock) mode.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr]">
        {/* Connect form */}
        <Card title="Connect an account">
          <form className="space-y-4" onSubmit={onConnect}>
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

            <div>
              <label className="label" htmlFor="label">Label / Brand name</label>
              <input
                id="label"
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Bright Smile Dental"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="handle">Handle</label>
              <input
                id="handle"
                className="input"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. @bright-smile"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="accessToken">
                Access token <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="accessToken"
                className="input"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Leave blank for demo mode"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-slate-500">
                Stored server-side and never returned — you&apos;ll only see a masked value.
              </p>
            </div>

            {formError && (
              <p className="text-sm text-red-300">{formError}</p>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={connecting || !handle.trim() || !label.trim()}
            >
              {connecting ? 'Connecting…' : '🔗 Connect account'}
            </button>
          </form>
        </Card>

        {/* Account list */}
        <div className="space-y-4">
          {loading && <Spinner label="Loading accounts…" />}
          {error && <ErrorState message={error} onRetry={reload} />}

          {data && data.length === 0 && (
            <Card>
              <p className="text-sm text-slate-400">
                No accounts connected yet. Use the form to connect a client&apos;s social
                account.
              </p>
            </Card>
          )}

          {data && data.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.map((account) => {
                const busy = busyId === account.id;
                return (
                  <article key={account.id} className="card flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {account.label}
                        </p>
                        <p className="truncate text-xs text-slate-400">{account.handle}</p>
                      </div>
                      <Badge tone={toneForStatus(account.platform)}>
                        {account.platform}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={account.connected ? 'green' : 'amber'}>
                        {account.connected ? 'Connected' : 'Demo'}
                      </Badge>
                      <Badge tone={account.active ? 'blue' : 'slate'}>
                        {account.active ? 'Active' : 'Paused'}
                      </Badge>
                      <span className="font-mono text-slate-500">
                        {account.tokenMasked}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Connected {formatDate(account.createdAt)}
                    </p>

                    <div className="mt-auto flex items-center gap-2 border-t border-slate-800/80 pt-3">
                      <button
                        type="button"
                        className="btn-secondary flex-1"
                        disabled={busy}
                        onClick={() => onToggle(account)}
                      >
                        {busy
                          ? '…'
                          : account.active
                          ? '⏸ Pause'
                          : '▶ Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary flex-1 text-red-300"
                        disabled={busy}
                        onClick={() => onDisconnect(account)}
                      >
                        Disconnect
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
