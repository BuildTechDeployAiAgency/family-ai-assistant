import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { type FamilyDocument } from '@/data/fixtures';
import { api } from '@/lib/api';
import { useAuth } from './auth';

interface DocumentsContextValue {
  documents: FamilyDocument[];
  loading: boolean;
  refresh: () => Promise<void>;
  addDocument: (doc: Omit<FamilyDocument, 'id'>) => FamilyDocument;
  getDocument: (id: string) => FamilyDocument | undefined;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    try {
      const { documents } = await api.documents();
      setDocuments(documents as FamilyDocument[]);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Optimistic add: show immediately with a temp id, POST in the background,
  // then reconcile with the server row (mirrors the app's local-first pattern).
  const addDocument = useCallback((doc: Omit<FamilyDocument, 'id'>) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: FamilyDocument = { ...doc, id: tempId };
    setDocuments((prev) => [optimistic, ...prev]);

    api
      .createDocument(doc)
      .then(({ document }) => {
        setDocuments((prev) => prev.map((d) => (d.id === tempId ? (document as FamilyDocument) : d)));
      })
      .catch((err) => console.error('Failed to save document to backend:', err));

    return optimistic;
  }, []);

  const getDocument = useCallback((id: string) => documents.find((d) => d.id === id), [documents]);

  const value = useMemo(
    () => ({ documents, loading, refresh, addDocument, getDocument }),
    [documents, loading, refresh, addDocument, getDocument]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentsProvider');
  return ctx;
}
