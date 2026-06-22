'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { useAuth } from '../components/AuthProvider';
import Card from '../components/Card';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      // AuthProvider redirects to / on success.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-3 flex justify-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-2xl shadow-lg shadow-brand-900/50">
            🛰️
          </span>
        </div>
        <h1 className="text-xl font-semibold text-slate-100">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to the Autonomous Social Media Agent.
        </p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full justify-center" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-xs">
            <Link href="/forgot" className="text-slate-400 hover:text-slate-200">
              Forgot your password?
            </Link>
          </p>
        </form>
      </Card>

      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-brand-300 hover:text-brand-200">
          Create one
        </Link>
      </p>
    </div>
  );
}
