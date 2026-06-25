import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

export interface Session {
  email: string;
  familyName: string;
  token: string; // real Supabase access_token
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, familyName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Map a Supabase auth session → our app Session shape.
function toSession(s: { access_token: string; user: any } | null): Session | null {
  if (!s) return null;
  return {
    email: s.user?.email ?? '',
    familyName: (s.user?.user_metadata?.family_name as string) ?? (s.user?.email?.split('@')[0] ?? 'Family'),
    token: s.access_token,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the persisted Supabase session on mount + subscribe to changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(toSession(data.session as any));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(toSession(s as any));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string, familyName: string) => {
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!familyName.trim()) throw new Error('Enter a family name.');
    // family_name flows into the DB trigger that creates the family + household member.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { family_name: familyName.trim() } },
    });
    if (error) throw new Error(error.message);
    // With email confirmation ON, Supabase returns a user but NO session — the
    // caller must tell the user to confirm. With it OFF, a session arrives and
    // onAuthStateChange logs them straight in.
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
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
