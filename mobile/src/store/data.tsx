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
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  initials: string;
  memberType: string;
  grade: string | null;
  dateOfBirth: string | null;
  age: number | null;
}

export interface MemberPatch {
  name?: string;
  role?: string | null;
  grade?: string | null;
  avatar?: string;
  color?: string;
  dateOfBirth?: string | null;
}

export interface MemberCreate {
  name: string;
  memberType: 'adult' | 'child' | 'household';
  role?: string | null;
  grade?: string | null;
  avatar?: string;
  color?: string;
  dateOfBirth?: string | null;
}

interface DataContextValue {
  communications: Communication[];
  tasks: Task[];
  members: Member[];
  loading: boolean;
  refresh: () => Promise<void>;
  toggleTask: (id: string, completed: boolean) => void;
  updateTask: (id: string, patch: { completed?: boolean; dueDate?: string | null }) => Promise<void>;
  addMember: (member: MemberCreate) => Promise<Member>;
  updateMember: (id: string, patch: MemberPatch) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
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

  // Optimistic task edit (due date and/or completion); reverted on error.
  const updateTask = useCallback(async (id: string, patch: { completed?: boolean; dueDate?: string | null }) => {
    let snapshot: Task[] = [];
    setTasks((prev) => {
      snapshot = prev;
      return prev.map((t) =>
        t.id === id
          ? { ...t, ...(patch.completed !== undefined ? { completed: patch.completed } : {}), ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}) }
          : t
      );
    });
    try {
      const { task } = await api.updateTask(id, patch);
      setTasks((prev) => prev.map((t) => (t.id === id ? (task as Task) : t)));
    } catch (err) {
      setTasks(snapshot);
      throw err;
    }
  }, []);

  // Create a member, then append the server's canonical row.
  const addMember = useCallback(async (input: MemberCreate) => {
    const { member } = await api.createMember(input);
    setMembers((prev) => [...prev, member as Member]);
    return member as Member;
  }, []);

  // Optimistic member edit; reconciled by the server response, reverted on error.
  const updateMember = useCallback(async (id: string, patch: MemberPatch) => {
    let snapshot: Member[] = [];
    setMembers((prev) => {
      snapshot = prev;
      return prev.map((m) => (m.id === id ? { ...m, ...patch } as Member : m));
    });
    try {
      const { member } = await api.updateMember(id, patch);
      setMembers((prev) => prev.map((m) => (m.id === id ? (member as Member) : m)));
    } catch (err) {
      setMembers(snapshot);
      throw err;
    }
  }, []);

  // Optimistic remove; restored on error.
  const removeMember = useCallback(async (id: string) => {
    let snapshot: Member[] = [];
    setMembers((prev) => {
      snapshot = prev;
      return prev.filter((m) => m.id !== id);
    });
    try {
      await api.deleteMember(id);
    } catch (err) {
      setMembers(snapshot);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({ communications, tasks, members, loading, refresh, toggleTask, updateTask, addMember, updateMember, removeMember }),
    [communications, tasks, members, loading, refresh, toggleTask, updateTask, addMember, updateMember, removeMember]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
