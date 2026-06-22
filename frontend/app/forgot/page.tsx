'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError, forgotPassword } from '@/lib/api';
import Card from '../components/Card';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-100">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <Card>
        {sent ? (
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              If an account exists for <strong>{email}</strong>, a password-reset link is on its
              way. Check your inbox (and spam).
            </p>
            <p className="text-xs text-slate-500">
              The link expires in 1 hour.
            </p>
          </div>
        ) : (
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
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full justify-center" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </Card>

      <p className="text-center text-sm text-slate-400">
        <Link href="/login" className="font-medium text-brand-300 hover:text-brand-200">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
