import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Session {
  email: string;
  familyName: string;
  // Placeholder token. Real Supabase access_token replaces this when the
  // backend is wired in — swap the body of signIn/signUp/restore only.
  token: string;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, familyName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const KEY = 'familyai.session';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted session on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) setSession(JSON.parse(raw) as Session);
      } catch {
        // ignore — treat as logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (s: Session) => {
    setSession(s);
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  };

  // Local/mock auth — no backend. Validates shape, accepts any credentials.
  const signIn = async (email: string, password: string) => {
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    await persist({ email: email.trim(), familyName: email.split('@')[0], token: 'local-dev' });
  };

  const signUp = async (email: string, password: string, familyName: string) => {
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!familyName.trim()) throw new Error('Enter a family name.');
    await persist({ email: email.trim(), familyName: familyName.trim(), token: 'local-dev' });
  };

  const signOut = async () => {
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
