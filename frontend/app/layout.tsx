import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './components/AuthProvider';
import AppShell from './components/AppShell';

export const metadata: Metadata = {
  title: 'Autonomous Social Media Agent',
  description:
    'AI-powered multi-agent platform for content creation, scheduling, publishing, analytics and self-learning optimization.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
