import { supabase } from './supabase';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

async function authedFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in.');

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error((msg as any)?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  family: () => authedFetch<{ family: any; members: any[] }>('/api/family'),
  documents: () => authedFetch<{ documents: any[] }>('/api/documents'),
  createDocument: (doc: any) =>
    authedFetch<{ document: any }>('/api/documents', { method: 'POST', body: JSON.stringify(doc) }),
  communications: () => authedFetch<{ communications: any[] }>('/api/communications'),
  tasks: () => authedFetch<{ tasks: any[] }>('/api/tasks'),
  setTaskCompleted: (id: string, completed: boolean) =>
    authedFetch<{ task: any }>(`/api/tasks?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),
  extract: (imageBase64: string, mimeType = 'image/jpeg') =>
    authedFetch<{ name: string; number: string; category: string; owner: string; expiryDate: string | null; confidence: number }>(
      '/api/ai/extract',
      { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }
    ),
  ask: (question: string) =>
    authedFetch<{ answer: string; toolsUsed: string[] }>('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
};
