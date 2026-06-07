import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { INITIAL_DOCUMENTS, type FamilyDocument } from '@/data/fixtures';

interface DocumentsContextValue {
  documents: FamilyDocument[];
  addDocument: (doc: Omit<FamilyDocument, 'id'>) => FamilyDocument;
  getDocument: (id: string) => FamilyDocument | undefined;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

let counter = 0;
const nextId = () => `doc-new-${(counter += 1)}`;

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<FamilyDocument[]>(INITIAL_DOCUMENTS);

  const addDocument = useCallback((doc: Omit<FamilyDocument, 'id'>) => {
    const created: FamilyDocument = { ...doc, id: nextId() };
    setDocuments((prev) => [created, ...prev]);
    return created;
  }, []);

  const getDocument = useCallback(
    (id: string) => documents.find((d) => d.id === id),
    [documents]
  );

  const value = useMemo(
    () => ({ documents, addDocument, getDocument }),
    [documents, addDocument, getDocument]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentsProvider');
  return ctx;
}
