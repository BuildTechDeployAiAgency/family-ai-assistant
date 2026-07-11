import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { FAMILY_MEMBERS } from '@/data/fixtures';
import { useAuth } from '@/store/auth';

export interface Member {
  id: number;
  name: string;
  role: string;
  color: string;
  avatar: string;
  isChild: boolean;
  grade: string;
  schoolEmail: string;
  aliases: string[];
}

// Display props for rendering an owner/assignee name anywhere in the UI,
// resolvable even when the name doesn't match a stored member.
export interface MemberDisplay {
  name: string;
  role: string;
  color: string;
  avatar: string;
  initials: string;
}

interface MembersContextValue {
  members: Member[];
  children: Member[];
  loading: boolean;
  resolve: (name: string) => MemberDisplay;
  getMember: (id: number) => Member | undefined;
  addMember: (member: Omit<Member, 'id'>) => Promise<Member>;
  updateMember: (id: number, patch: Partial<Omit<Member, 'id'>>) => Promise<Member>;
  deleteMember: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const MembersContext = createContext<MembersContextValue | null>(null);

const FALLBACK_COLOR = '#8fa3c0';

export function MembersProvider({ children: kids }: { children: ReactNode }) {
  const { session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await api.get<Member[]>('/api/members'));
    } catch (err) {
      console.error('Failed to load family members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setMembers([]);
    }
  }, [session, refresh]);

  const resolve = useCallback(
    (name: string): MemberDisplay => {
      const stored = members.find((m) => m.name.toLowerCase() === (name || '').toLowerCase());
      if (stored) {
        return {
          name: stored.name,
          role: stored.role,
          color: stored.color,
          avatar: stored.avatar,
          initials: stored.name.charAt(0).toUpperCase(),
        };
      }
      // Fixture styling keeps the demo family looking right before seeding.
      const fixture = Object.values(FAMILY_MEMBERS).find(
        (m) => m.name.toLowerCase() === (name || '').toLowerCase()
      );
      if (fixture) {
        return { ...fixture, role: fixture.role };
      }
      return {
        name: name || 'Unknown',
        role: '',
        color: FALLBACK_COLOR,
        avatar: '👤',
        initials: (name || '?').charAt(0).toUpperCase(),
      };
    },
    [members]
  );

  const getMember = useCallback((id: number) => members.find((m) => m.id === id), [members]);

  const addMember = useCallback(async (member: Omit<Member, 'id'>) => {
    const created = await api.post<Member>('/api/members', member);
    setMembers((prev) => [...prev, created]);
    return created;
  }, []);

  const updateMember = useCallback(async (id: number, patch: Partial<Omit<Member, 'id'>>) => {
    const updated = await api.put<Member>(`/api/members/${id}`, patch);
    setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  const deleteMember = useCallback(async (id: number) => {
    await api.del(`/api/members/${id}`);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      members,
      children: members.filter((m) => m.isChild),
      loading,
      resolve,
      getMember,
      addMember,
      updateMember,
      deleteMember,
      refresh,
    }),
    [members, loading, resolve, getMember, addMember, updateMember, deleteMember, refresh]
  );

  return <MembersContext.Provider value={value}>{kids}</MembersContext.Provider>;
}

export function useMembers() {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error('useMembers must be used within MembersProvider');
  return ctx;
}
