import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, HttpError } from './_lib/http.js';

// DB row → mobile FamilyEmail shape.
function toClient(row: any) {
  return {
    id: row.id,
    from: row.sender ?? '',
    subject: row.subject ?? '',
    date: row.received_at ? String(row.received_at).slice(0, 10) : '',
    icon: row.icon ?? '✉️',
    category: row.category ?? 'Other',
    body: row.body ?? '',
    read: !!row.read,
    owner: row.family_members?.name ?? null,
  };
}

export default withAuth(['GET'], async (_req: VercelRequest, res: VercelResponse, ctx) => {
  const { data, error } = await ctx.supabase
    .from('communications')
    .select('id, sender, subject, body, category, icon, received_at, read, family_members(name)')
    .order('received_at', { ascending: false });
  if (error) throw new HttpError(500, 'Failed to load communications');
  return res.status(200).json({ communications: (data ?? []).map(toClient) });
});
