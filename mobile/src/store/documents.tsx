import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { type FamilyDocument } from '@/data/fixtures';
import { useAuth } from '@/store/auth';

interface DocumentsContextValue {
  documents: FamilyDocument[];
  loading: boolean;
  addDocument: (doc: Omit<FamilyDocument, 'id'>) => FamilyDocument;
  getDocument: (id: string) => FamilyDocument | undefined;
  deleteDocument: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

const nextId = () => `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await api.get<FamilyDocument[]>('/api/documents'));
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setDocuments([]);
    }
  }, [session, refresh]);

  // Optimistic add: local state updates immediately, server write follows.
  const addDocument = useCallback((doc: Omit<FamilyDocument, 'id'>) => {
    const created: FamilyDocument = { ...doc, id: nextId() };
    setDocuments((prev) => [created, ...prev]);
    api.post('/api/documents', created).catch((err) => {
      console.error('Failed to save document to server:', err);
    });
    return created;
  }, []);

  const getDocument = useCallback(
    (id: string) => documents.find((d) => d.id === id),
    [documents]
  );

  const deleteDocument = useCallback(async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await api.del(`/api/documents/${id}`);
  }, []);

  const value = useMemo(
    () => ({ documents, loading, addDocument, getDocument, deleteDocument, refresh }),
    [documents, loading, addDocument, getDocument, deleteDocument, refresh]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentsProvider');
  return ctx;
}
