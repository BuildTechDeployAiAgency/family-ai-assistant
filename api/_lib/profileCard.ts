import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { ageFromDob, listMembers } from './members.js';

// Hard cap on injected memory (Hermes' ~2.2k-char MEMORY.md discipline). Keeps
// the always-on prefix FLAT regardless of how much history a family accrues —
// the single most important prompt-cost control. Facts are salience-ranked and
// truncated to this budget; the rest stay queryable but out of the hot prompt.
const MEMORY_CHAR_BUDGET = 1800;

const TONE_GUIDANCE: Record<string, string> = {
  concise: 'Keep answers short and direct.',
  detailed: 'Give thorough answers with the relevant details and context.',
  warm: 'Answer warmly and personably, while staying clear and useful.',
};

// Layer 1 — the always-on Family Profile Card. Members + ages (derived, never
// stale) + live counts + curated family memory + the caller's preferences.
// Goes in the prompt-cached system prefix. Scales with family size + a capped
// memory budget, NEVER with history length.
export async function buildProfileCard(supabase: SupabaseClient): Promise<string> {
  const today = env.REFERENCE_DATE;

  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  const soonStr = soon.toISOString().slice(0, 10);

  const [members, expiringRes, openRes, memoryRes, prefRes] = await Promise.all([
    listMembers(supabase),
    supabase.from('documents').select('id', { count: 'exact', head: true }).lte('expiry_date', soonStr),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', false),
    // Active memory, most-salient first; capped in code below.
    supabase
      .from('family_memory')
      .select('fact, kind, salience')
      .eq('status', 'active')
      .order('salience', { ascending: false })
      .limit(40),
    // RLS scopes this to the calling user's own row.
    supabase.from('preferences').select('tone, assistant_name').maybeSingle(),
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

  const sections = [
    `Today is ${today}.`,
    `Family members: ${roster}.`,
    `Live counts: ${expiringRes.count ?? 0} documents expiring within 30 days, ${openRes.count ?? 0} open tasks.`,
  ];

  // [What I've learned] — capped, salience-ordered.
  const facts: string[] = [];
  let used = 0;
  for (const row of (memoryRes.data ?? []) as { fact: string }[]) {
    const line = `- ${row.fact}`;
    if (used + line.length > MEMORY_CHAR_BUDGET) break;
    facts.push(line);
    used += line.length + 1;
  }
  if (facts.length) {
    sections.push(`What I know about this family:\n${facts.join('\n')}`);
  }

  // [How to talk to you] — the caller's preferences.
  const pref = (prefRes.data ?? null) as { tone?: string; assistant_name?: string } | null;
  if (pref) {
    const bits: string[] = [];
    if (pref.tone && TONE_GUIDANCE[pref.tone]) bits.push(TONE_GUIDANCE[pref.tone]);
    if (pref.assistant_name) bits.push(`They call you "${pref.assistant_name}".`);
    if (bits.length) sections.push(bits.join(' '));
  }

  return sections.join('\n\n');
}
