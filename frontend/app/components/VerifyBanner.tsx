'use client';

import { useState } from 'react';
import { ApiError, requestVerification } from '@/lib/api';
import { useAuth } from './AuthProvider';

/** Dismissible prompt shown when the logged-in user hasn't verified their email. */
export default function VerifyBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified) return null;

  async function resend() {
    setSending(true);
    setError(null);
    try {
      await requestVerification();
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send email.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-8 py-2 text-sm text-amber-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <span>
          {sent
            ? '📧 Verification email sent — check your inbox.'
            : '📧 Please verify your email to secure your account.'}
          {error && <span className="ml-2 text-red-300">{error}</span>}
        </span>
        {!sent && (
          <button
            type="button"
            onClick={resend}
            disabled={sending}
            className="shrink-0 rounded-md bg-amber-500/20 px-3 py-1 text-xs font-medium hover:bg-amber-500/30 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
        )}
      </div>
    </div>
  );
}
