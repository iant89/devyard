import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthState, LoginRequest } from '@devyard/contracts';
import { ApiClient, ApiError, type BootstrapInput } from '../api/client';

/**
 * App-wide auth state machine:
 *   loading → bootstrap (zero users) | anonymous | authenticated
 * `expired` marks an anonymous state reached through a 401 mid-session (shows the warning strip).
 */
export type AuthStatus =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'bootstrap' }
  | { kind: 'anonymous'; expired: boolean }
  | { kind: 'authenticated'; auth: AuthState };

export interface AuthContextValue {
  status: AuthStatus;
  api: ApiClient;
  login: (input: LoginRequest) => Promise<void>;
  bootstrap: (input: BootstrapInput) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Unexpected error');

/** Initial resolution: an existing session wins; otherwise bootstrap vs. sign-in. */
async function resolveStatus(api: ApiClient): Promise<AuthStatus> {
  try {
    return { kind: 'authenticated', auth: await api.me() };
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) return { kind: 'error', message: message(e) };
  }
  try {
    const { required } = await api.bootstrapStatus();
    return required ? { kind: 'bootstrap' } : { kind: 'anonymous', expired: false };
  } catch (e) {
    return { kind: 'error', message: message(e) };
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  api: injected,
}: {
  children: ReactNode;
  api?: ApiClient;
}) {
  const [status, setStatus] = useState<AuthStatus>({ kind: 'loading' });
  const api = useMemo(() => injected ?? new ApiClient(), [injected]);

  useEffect(
    () =>
      api.onUnauthenticated(() =>
        setStatus((s) => (s.kind === 'authenticated' ? { kind: 'anonymous', expired: true } : s)),
      ),
    [api],
  );

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void resolveStatus(api).then((next) => {
      if (live) setStatus(next);
    });
    return () => {
      live = false;
    };
  }, [api, attempt]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      api,
      retry: () => {
        setStatus({ kind: 'loading' });
        setAttempt((n) => n + 1);
      },
      login: async (input) => {
        const auth = await api.login(input);
        setStatus({ kind: 'authenticated', auth });
      },
      bootstrap: async (input) => {
        const auth = await api.bootstrap(input);
        setStatus({ kind: 'authenticated', auth });
      },
      logout: async () => {
        try {
          await api.logout();
        } finally {
          setStatus({ kind: 'anonymous', expired: false });
        }
      },
    }),
    [status, api],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
