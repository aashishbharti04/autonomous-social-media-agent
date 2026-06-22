'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  getToken,
  setToken,
  clearToken,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from '@/lib/api';
import Spinner from './Spinner';

/** Routes that render without the app shell and don't require a session. */
export const PUBLIC_PATHS = ['/login', '/register'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore the session from a stored token (if any).
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch(() => {
        // Invalid/expired token — request() already cleared it on 401.
        if (!cancelled) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (body: LoginRequest) => {
      const { token, user: u } = await apiLogin(body);
      setToken(token);
      setUser(u);
      router.push('/');
    },
    [router]
  );

  const register = useCallback(
    async (body: RegisterRequest) => {
      const { token, user: u } = await apiRegister(body);
      setToken(token);
      setUser(u);
      router.push('/');
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Gates the app shell: shows a spinner while restoring the session, redirects
 * unauthenticated users to /login (except on public auth pages), and otherwise
 * renders children.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onPublicPath = isPublicPath(pathname);

  useEffect(() => {
    if (!loading && !user && !onPublicPath) {
      router.replace('/login');
    }
  }, [loading, user, onPublicPath, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Loading…" />
      </div>
    );
  }

  // Authenticated users shouldn't sit on the auth pages.
  if (user && onPublicPath) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Redirecting…" />
      </div>
    );
  }

  // Unauthenticated on a protected route — render nothing while redirecting.
  if (!user && !onPublicPath) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Redirecting to sign in…" />
      </div>
    );
  }

  return <>{children}</>;
}
