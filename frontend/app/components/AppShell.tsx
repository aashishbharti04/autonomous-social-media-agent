'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import Sidebar from './Sidebar';
import VerifyBanner from './VerifyBanner';
import { AuthGate, PUBLIC_PATHS } from './AuthProvider';

/**
 * Chooses the layout chrome based on the route:
 * - Public auth routes (/login, /register) render bare and centered.
 * - Everything else renders the sidebar + header app shell.
 * Both are wrapped by <AuthGate> so the session is resolved first.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = PUBLIC_PATHS.includes(pathname);

  if (bare) {
    return (
      <AuthGate>
        <div className="grid min-h-screen place-items-center px-4 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/70 px-8 py-4 backdrop-blur">
            <h1 className="text-base font-semibold text-slate-100">
              Autonomous Social Media Agent
            </h1>
          </header>
          <VerifyBanner />
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
