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
  createMember: (member: object) =>
    authedFetch<{ member: any }>('/api/members', { method: 'POST', body: JSON.stringify(member) }),
  updateMember: (id: string, patch: object) =>
    authedFetch<{ member: any }>(`/api/members?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteMember: (id: string) =>
    authedFetch<{ ok: boolean }>(`/api/members?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  preferences: () =>
    authedFetch<{ preferences: { tone: string; assistantName: string | null; aiModel: string; language: string } }>(
      '/api/preferences'
    ),
  updatePreferences: (patch: object) =>
    authedFetch<{ preferences: any }>('/api/preferences', { method: 'PATCH', body: JSON.stringify(patch) }),
  memory: () => authedFetch<{ memory: any[] }>('/api/memory'),
  addMemory: (fact: string, kind = 'fact', salience = 50) =>
    authedFetch<{ memory: any }>('/api/memory', { method: 'POST', body: JSON.stringify({ fact, kind, salience }) }),
  updateMemory: (id: string, patch: object) =>
    authedFetch<{ memory: any }>(`/api/memory?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteMemory: (id: string) =>
    authedFetch<{ ok: boolean }>(`/api/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  communications: () => authedFetch<{ communications: any[] }>('/api/communications'),
  tasks: () => authedFetch<{ tasks: any[] }>('/api/tasks'),
  setTaskCompleted: (id: string, completed: boolean) =>
    authedFetch<{ task: any }>(`/api/tasks?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),
  updateTask: (id: string, patch: { completed?: boolean; dueDate?: string | null }) =>
    authedFetch<{ task: any }>(`/api/tasks?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  steps: (taskId: string) =>
    authedFetch<{ steps: any[] }>(`/api/steps?taskId=${encodeURIComponent(taskId)}`),
  createStep: (taskId: string, title: string, position = 0) =>
    authedFetch<{ step: any }>('/api/steps', {
      method: 'POST',
      body: JSON.stringify({ taskId, title, position }),
    }),
  updateStep: (id: string, patch: { title?: string; detail?: string | null; completed?: boolean; position?: number; status?: string }) =>
    authedFetch<{ step: any }>(`/api/steps?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteStep: (id: string) =>
    authedFetch<{ ok: boolean }>(`/api/steps?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
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
