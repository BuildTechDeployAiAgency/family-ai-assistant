import type { SupabaseClient } from '@supabase/supabase-js';

export interface Member {
  id: string;
  name: string;
  member_type: string;
  role: string | null;
  date_of_birth: string | null;
  grade: string | null;
  aliases: string[];
}

export type ResolveResult =
  | { status: 'ok'; member: Member }
  | { status: 'ambiguous'; candidates: string[] }
  | { status: 'not_found' };

const MEMBER_COLS = 'id, name, member_type, role, date_of_birth, grade, aliases';

export async function listMembers(supabase: SupabaseClient): Promise<Member[]> {
  const { data } = await supabase.from('family_members').select(MEMBER_COLS);
  return (data ?? []) as Member[];
}

// Fuzzy name → canonical member. Never guesses across multiple matches.
export async function resolveMember(supabase: SupabaseClient, name: string): Promise<ResolveResult> {
  const needle = name.trim().toLowerCase();
  if (!needle) return { status: 'not_found' };

  const members = await listMembers(supabase);
  const matches = members.filter(
    (m) => m.name.toLowerCase() === needle || (m.aliases ?? []).map((a) => a.toLowerCase()).includes(needle)
  );
  if (matches.length === 1) return { status: 'ok', member: matches[0] };
  if (matches.length > 1) return { status: 'ambiguous', candidates: matches.map((m) => m.name) };

  // Fall back to prefix/contains for partial names.
  const partial = members.filter(
    (m) => m.name.toLowerCase().startsWith(needle) || (m.aliases ?? []).some((a) => a.toLowerCase().startsWith(needle))
  );
  if (partial.length === 1) return { status: 'ok', member: partial[0] };
  if (partial.length > 1) return { status: 'ambiguous', candidates: partial.map((m) => m.name) };
  return { status: 'not_found' };
}

export function ageFromDob(dob: string | null, today: string): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  const t = new Date(today);
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}
