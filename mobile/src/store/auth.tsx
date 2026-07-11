import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuthToken, ApiError } from '@/lib/api';

export interface Session {
  email: string;
  familyName: string;
  token: string; // JWT issued by the Express backend (30-day expiry)
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, familyName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthResponse {
  token: string;
  user: { id: number; email: string; familyName: string };
}

const AuthContext = createContext<AuthContextValue | null>(null);
const KEY = 'familyai.session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted session on mount, validating the token against the API.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (!raw) return;
        const stored = JSON.parse(raw) as Session;
        setAuthToken(stored.token);
        try {
          const { user } = await api.get<{ user: AuthResponse['user'] }>('/api/auth/me');
          setSession({ email: user.email, familyName: user.familyName, token: stored.token });
        } catch (err) {
          if (err instanceof ApiError && err.status === 0) {
            // Server unreachable — keep the stored session so the app works
            // offline; requests will surface errors until the server is back.
            setSession(stored);
          } else {
            // Token rejected — treat as signed out.
            setAuthToken(null);
            await SecureStore.deleteItemAsync(KEY);
          }
        }
      } catch {
        // ignore — treat as logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (s: Session) => {
    setAuthToken(s.token);
    setSession(s);
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  };

  const signIn = async (email: string, password: string) => {
    const { token, user } = await api.post<AuthResponse>('/api/auth/login', {
      email: email.trim(),
      password,
    });
    await persist({ email: user.email, familyName: user.familyName, token });
  };

  const signUp = async (email: string, password: string, familyName: string) => {
    if (!familyName.trim()) throw new Error('Enter a family name.');
    const { token, user } = await api.post<AuthResponse>('/api/auth/register', {
      email: email.trim(),
      password,
      familyName: familyName.trim(),
    });
    await persist({ email: user.email, familyName: user.familyName, token });
  };

  const signOut = async () => {
    setAuthToken(null);
    setSession(null);
    await SecureStore.deleteItemAsync(KEY);
  };

  const value = useMemo(
    () => ({ session, loading, signIn, signUp, signOut }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
