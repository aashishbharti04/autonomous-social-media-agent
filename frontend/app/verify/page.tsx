'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError, verifyEmail } from '@/lib/api';
import Card from '../components/Card';
import Spinner from '../components/Spinner';

type State = 'verifying' | 'success' | 'error';

export default function VerifyPage() {
  const [state, setState] = useState<State>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React 18 strict-mode double-invoke
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setState('error');
      setMessage('Missing verification token. Please use the link from your email.');
      return;
    }
    verifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setMessage(err instanceof ApiError ? err.message : 'Verification failed.');
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-100">Email verification</h1>
      </div>
      <Card>
        {state === 'verifying' && <Spinner label="Verifying your email…" />}
        {state === 'success' && (
          <div className="space-y-4 text-sm text-slate-300">
            <p>✅ Your email is verified. Thanks!</p>
            <Link href="/" className="btn-primary w-full justify-center">
              Go to dashboard
            </Link>
          </div>
        )}
        {state === 'error' && (
          <div className="space-y-4 text-sm">
            <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-red-300">
              {message}
            </p>
            <Link href="/" className="btn-secondary w-full justify-center">
              Continue to app
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
