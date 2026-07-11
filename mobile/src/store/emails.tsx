import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError } from '@/lib/api';
import { MOCK_AI_RESPONSES, type AiAnalysis } from '@/data/fixtures';
import { useAuth } from '@/store/auth';

export interface EmailRecord {
  id: string;
  from: string;
  subject: string;
  date: string;
  icon: string;
  category: string;
  body: string;
  read: boolean;
  processed: boolean;
}

export interface AnalyzeResult {
  analysis: AiAnalysis;
  demo: boolean; // true when served from the offline demo fixtures
}

interface EmailsContextValue {
  emails: EmailRecord[];
  analyses: Record<string, AiAnalysis>;
  loading: boolean;
  analyzing: string | null;
  analyze: (id: string) => Promise<AnalyzeResult | null>;
  markRead: (id: string) => void;
  refresh: () => Promise<void>;
}

const EmailsContext = createContext<EmailsContextValue | null>(null);

export function EmailsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, AiAnalysis>>({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<any[]>('/api/emails');
      setEmails(
        rows.map((e) => ({
          id: e.id,
          from: e.from || e.sender,
          subject: e.subject,
          date: e.date,
          icon: e.icon || '✉️',
          category: e.category || 'General',
          body: e.body,
          read: !!e.read,
          processed: !!e.processed,
        }))
      );
      // Hydrate cached AI analyses so "AI ready" badges survive restarts.
      const cached = await api
        .get<Record<string, AiAnalysis>>('/api/ai/email-analyses')
        .catch(() => ({} as Record<string, AiAnalysis>));
      setAnalyses(cached);
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setEmails([]);
      setAnalyses({});
    }
  }, [session, refresh]);

  const analyze = useCallback(
    async (id: string): Promise<AnalyzeResult | null> => {
      if (analyses[id]) return { analysis: analyses[id], demo: false };
      setAnalyzing(id);
      try {
        const analysis = await api.post<AiAnalysis>('/api/ai/analyze-email', { emailId: id });
        setAnalyses((prev) => ({ ...prev, [id]: analysis }));
        return { analysis, demo: false };
      } catch (err) {
        // AI offline (503/unreachable) — fall back to demo fixtures when we
        // have them so the flow stays demoable.
        if (err instanceof ApiError && (err.status === 503 || err.status === 0)) {
          const mock = MOCK_AI_RESPONSES[id];
          if (mock) {
            setAnalyses((prev) => ({ ...prev, [id]: mock }));
            return { analysis: mock, demo: true };
          }
        }
        console.error('Email analysis failed:', err);
        return null;
      } finally {
        setAnalyzing(null);
      }
    },
    [analyses]
  );

  const markRead = useCallback((id: string) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, read: true } : e)));
    api.put(`/api/emails/${id}`, { read: true }).catch((err) => {
      console.error('Failed to mark email read:', err);
    });
  }, []);

  const value = useMemo(
    () => ({ emails, analyses, loading, analyzing, analyze, markRead, refresh }),
    [emails, analyses, loading, analyzing, analyze, markRead, refresh]
  );

  return <EmailsContext.Provider value={value}>{children}</EmailsContext.Provider>;
}

export function useEmails() {
  const ctx = useContext(EmailsContext);
  if (!ctx) throw new Error('useEmails must be used within EmailsProvider');
  return ctx;
}
