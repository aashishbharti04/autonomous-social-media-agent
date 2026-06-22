'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/compose', label: 'Compose', icon: '✍️' },
  { href: '/posts', label: 'Posts', icon: '🗂️' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/trends', label: 'Trends', icon: '🔥' },
  { href: '/memory', label: 'Memory', icon: '🧠' },
  { href: '/accounts', label: 'Accounts', icon: '🔗' },
  { href: '/media', label: 'Media', icon: '🖼️' },
  { href: '/agents', label: 'Agents', icon: '🤖' },
  { href: '/guide', label: 'Guide', icon: '📖' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/70 px-4 py-6 backdrop-blur">
      <div className="px-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-lg shadow-lg shadow-brand-900/50">
            🛰️
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-100">Autonomous</p>
            <p className="text-xs text-slate-400">Social Media Agent</p>
          </div>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-600/20 text-brand-200 ring-1 ring-inset ring-brand-500/40'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600/30 text-sm font-semibold text-brand-200">
              {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-slate-100">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="btn-secondary mt-3 w-full justify-center text-xs"
          >
            Log out
          </button>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 text-xs text-slate-500">
        Multi-agent pipeline: content, SEO, image, publishing, analytics &amp; self-learning.
      </div>
    </aside>
  );
}
