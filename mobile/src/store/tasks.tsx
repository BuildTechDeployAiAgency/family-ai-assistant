import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

export type TaskType = 'task' | 'reminder' | 'meeting';
export type Urgency = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  category: string;
  type: TaskType;
  memberId: number | null;
  sourceEmailId: string | null;
  urgency: Urgency;
  notes: string;
  startAt: string | null; // ISO datetime (meetings)
  endAt: string | null;
}

export type NewTask = Omit<Task, 'id' | 'completed'> & { id?: string; completed?: boolean };

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  createTask: (task: NewTask) => Promise<Task>;
  toggleComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

const nextId = () => `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export function TasksProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await api.get<Task[]>('/api/tasks'));
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setTasks([]);
    }
  }, [session, refresh]);

  const createTask = useCallback(async (task: NewTask) => {
    const payload: Task = { completed: false, ...task, id: task.id ?? nextId() };
    setTasks((prev) => [payload, ...prev]);
    try {
      const created = await api.post<Task>('/api/tasks', payload);
      setTasks((prev) => prev.map((t) => (t.id === payload.id ? created : t)));
      return created;
    } catch (err) {
      console.error('Failed to save task to server:', err);
      return payload;
    }
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    let next = false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        next = !t.completed;
        return { ...t, completed: next };
      })
    );
    try {
      await api.put(`/api/tasks/${id}`, { completed: next });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await api.del(`/api/tasks/${id}`);
  }, []);

  const value = useMemo(
    () => ({ tasks, loading, createTask, toggleComplete, deleteTask, refresh }),
    [tasks, loading, createTask, toggleComplete, deleteTask, refresh]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
