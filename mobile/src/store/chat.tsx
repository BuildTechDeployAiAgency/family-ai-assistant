import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { scheduleLocalReminder } from '@/lib/notifications';
import { useAuth } from '@/store/auth';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AgentAction[];
}

export interface AgentAction {
  type: 'task' | 'reminder' | 'meeting';
  id: string;
  title: string;
  dueDate?: string;
  remindAt?: string;
  channel?: 'push' | 'call';
  startAt?: string;
  endAt?: string;
}

interface ChatContextValue {
  messages: ChatMessage[];
  sending: boolean;
  send: (text: string) => Promise<AgentAction[]>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

let localId = 0;
const nextId = () => `local-${(localId += 1)}`;

export function ChatProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!session) {
      setMessages([]);
      return;
    }
    api
      .get<{ id: number; role: 'user' | 'assistant'; content: string }[]>('/api/ai/chat/history')
      .then((rows) => setMessages(rows.map((r) => ({ id: String(r.id), role: r.role, content: r.content }))))
      .catch((err) => console.error('Failed to load chat history:', err));
  }, [session]);

  const send = useCallback(async (text: string): Promise<AgentAction[]> => {
    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await api.post<{ message: string; actionsTaken: AgentAction[] }>('/api/ai/chat', {
        message: text,
      });
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: res.message, actions: res.actionsTaken },
      ]);
      // Reminders created by the agent still need an on-device notification
      // (Expo Go can't receive remote push — see lib/notifications.ts).
      for (const action of res.actionsTaken) {
        if (action.type === 'reminder' && action.remindAt && action.channel !== 'call') {
          await scheduleLocalReminder('⏰ ' + action.title, 'Family AI reminder', new Date(action.remindAt));
        }
      }
      return res.actionsTaken;
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content:
            err?.status === 503
              ? 'The AI service is not configured yet — add OPENROUTER_API_KEY on the server to chat with me.'
              : `Sorry, something went wrong: ${err?.message ?? 'unknown error'}`,
        },
      ]);
      return [];
    } finally {
      setSending(false);
    }
  }, []);

  const value = useMemo(() => ({ messages, sending, send }), [messages, sending, send]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
