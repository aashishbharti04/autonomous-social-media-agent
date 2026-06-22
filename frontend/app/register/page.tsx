'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { useAuth } from '../components/AuthProvider';
import Card from '../components/Card';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ name, email, password });
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
        <h1 className="text-xl font-semibold text-slate-100">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Get started with the Autonomous Social Media Agent.
        </p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              required
            />
          </div>

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
              autoComplete="new-password"
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
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </Card>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-300 hover:text-brand-200">
          Sign in
        </Link>
      </p>
    </div>
  );
}
