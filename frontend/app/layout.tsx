import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './components/Sidebar';

export const metadata: Metadata = {
  title: 'Autonomous Social Media Agent',
  description:
    'AI-powered multi-agent platform for content creation, scheduling, publishing, analytics and self-learning optimization.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/70 px-8 py-4 backdrop-blur">
              <h1 className="text-base font-semibold text-slate-100">
                Autonomous Social Media Agent
              </h1>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
