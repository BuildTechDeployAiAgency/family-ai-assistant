import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { useAuth } from './auth';

export interface Communication {
  id: string;
  from: string;
  subject: string;
  date: string;
  icon: string;
  category: string;
  body: string;
  read: boolean;
  owner: string | null;
}

export interface Task {
  id: string;
  title: string;
  owner: string;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  sourceCommId: string | null;
}

export interface Member {
  name: string;
  role: string;
  avatar: string;
  color: string;
  initials: string;
  memberType: string;
  grade: string | null;
  age: number | null;
}

interface DataContextValue {
  communications: Communication[];
  tasks: Task[];
  members: Member[];
  loading: boolean;
  refresh: () => Promise<void>;
  toggleTask: (id: string, completed: boolean) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setCommunications([]);
      setTasks([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    try {
      const [comms, tsk, fam] = await Promise.all([api.communications(), api.tasks(), api.family()]);
      setCommunications(comms.communications as Communication[]);
      setTasks(tsk.tasks as Task[]);
      setMembers(fam.members as Member[]);
    } catch (err) {
      console.error('Failed to load family data:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Optimistic completion toggle; reconciled by the server response.
  const toggleTask = useCallback((id: string, completed: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    api.setTaskCompleted(id, completed).catch((err) => {
      console.error('Failed to update task:', err);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
    });
  }, []);

  const value = useMemo(
    () => ({ communications, tasks, members, loading, refresh, toggleTask }),
    [communications, tasks, members, loading, refresh, toggleTask]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
