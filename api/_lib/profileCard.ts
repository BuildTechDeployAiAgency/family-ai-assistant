import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { ageFromDob, listMembers } from './members.js';

// Layer 1 — the always-on Family Profile Card (~150 tokens). Members + ages
// (derived from DOB, never stale) + live counts. Goes in the prompt-cached
// system prefix. Scales with family size, not history.
export async function buildProfileCard(supabase: SupabaseClient): Promise<string> {
  const today = env.REFERENCE_DATE;
  const members = await listMembers(supabase);

  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  const soonStr = soon.toISOString().slice(0, 10);

  const [{ count: expiringDocs }, { count: openTasks }] = await Promise.all([
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .lte('expiry_date', soonStr),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('completed', false),
  ]);

  const roster = members
    .map((m) => {
      const age = ageFromDob(m.date_of_birth, today);
      const bits = [m.role ?? m.member_type];
      if (age !== null) bits.push(`age ${age}`);
      if (m.grade) bits.push(m.grade);
      return `${m.name} (${bits.join(', ')})`;
    })
    .join('; ');

  return [
    `Today is ${today}.`,
    `Family members: ${roster}.`,
    `Live counts: ${expiringDocs ?? 0} documents expiring within 30 days, ${openTasks ?? 0} open tasks.`,
  ].join(' ');
}
