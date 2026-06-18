import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { resolveMember } from './members.js';

// Layer 2 — tool-calling over structured facts. The model never sees SQL and
// never receives a family_id; RLS (the user's JWT) enforces isolation. Every
// query is capped at 50 rows. member_name is resolved server-side via aliases;
// ambiguity returns { ambiguous } so the model asks to clarify, never guesses.

const ROW_CAP = 50;

export const toolDefs = [
  {
    type: 'function',
    function: {
      name: 'get_documents',
      description: 'List family documents with expiry dates and renewal status. Use for passports, licences, IDs, insurance, etc.',
      parameters: {
        type: 'object',
        properties: {
          member_name: { type: 'string', description: 'Optional. Whose documents (e.g. "Ahmed", "Yusuf"). Omit for the whole family.' },
          category: { type: 'string', description: 'Optional category filter, e.g. Identity, Driving, Health, Finance, Education.' },
          expiring_within_days: { type: 'number', description: 'Optional. Only documents expiring within this many days from today.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'List family to-dos / action items with due dates.',
      parameters: {
        type: 'object',
        properties: {
          member_name: { type: 'string', description: 'Optional. Whose tasks.' },
          due_within_days: { type: 'number', description: 'Optional. Only tasks due within this many days from today.' },
          include_completed: { type: 'boolean', description: 'Optional. Include completed tasks (default false).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_school_results',
      description: 'Get a child\'s school grades / results.',
      parameters: {
        type: 'object',
        properties: {
          child_name: { type: 'string', description: 'Required. The child whose results to fetch.' },
          subject: { type: 'string', description: 'Optional subject filter.' },
          latest_only: { type: 'boolean', description: 'Optional. Return only the single most recent result.' },
        },
        required: ['child_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_family_member',
      description: 'Resolve a fuzzy name to a canonical family member (handles nicknames / spelling).',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'The name to resolve.' } },
        required: ['name'],
      },
    },
  },
];

function daysFromNow(days: number): string {
  const d = new Date(env.REFERENCE_DATE);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Resolve member_name → member_id; returns a short-circuit payload on ambiguity.
async function memberFilter(supabase: SupabaseClient, name?: string) {
  if (!name) return { memberId: null as string | null, short: null as any };
  const r = await resolveMember(supabase, name);
  if (r.status === 'ambiguous') return { memberId: null, short: { ambiguous: r.candidates } };
  if (r.status === 'not_found') return { memberId: null, short: { error: `No family member matching "${name}".` } };
  return { memberId: r.member.id, short: null };
}

export async function runTool(supabase: SupabaseClient, name: string, args: any): Promise<any> {
  switch (name) {
    case 'get_documents': {
      const { memberId, short } = await memberFilter(supabase, args.member_name);
      if (short) return short;
      let q = supabase
        .from('documents')
        .select('title, category, document_number, expiry_date, status, progress, family_members(name)')
        .order('expiry_date', { ascending: true })
        .limit(ROW_CAP);
      if (memberId) q = q.eq('member_id', memberId);
      if (args.category) q = q.ilike('category', args.category);
      if (typeof args.expiring_within_days === 'number') q = q.lte('expiry_date', daysFromNow(args.expiring_within_days));
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { today: env.REFERENCE_DATE, documents: data };
    }

    case 'get_tasks': {
      const { memberId, short } = await memberFilter(supabase, args.member_name);
      if (short) return short;
      let q = supabase
        .from('tasks')
        .select('title, priority, due_date, completed, family_members(name)')
        .order('due_date', { ascending: true })
        .limit(ROW_CAP);
      if (memberId) q = q.eq('member_id', memberId);
      if (!args.include_completed) q = q.eq('completed', false);
      if (typeof args.due_within_days === 'number') q = q.lte('due_date', daysFromNow(args.due_within_days));
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { today: env.REFERENCE_DATE, tasks: data };
    }

    case 'get_school_results': {
      const { memberId, short } = await memberFilter(supabase, args.child_name);
      if (short) return short;
      if (!memberId) return { error: 'child_name did not resolve to a family member.' };
      let q = supabase
        .from('school_results')
        .select('subject, term, grade, numeric_score, result_date')
        .eq('member_id', memberId)
        .order('result_date', { ascending: false })
        .limit(args.latest_only ? 1 : ROW_CAP);
      if (args.subject) q = q.ilike('subject', args.subject);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { results: data };
    }

    case 'get_family_member': {
      const r = await resolveMember(supabase, args.name ?? '');
      if (r.status === 'ok') {
        const { id, ...rest } = r.member;
        return { member: rest };
      }
      if (r.status === 'ambiguous') return { ambiguous: r.candidates };
      return { not_found: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
