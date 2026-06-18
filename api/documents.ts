import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, parseBody, HttpError } from './_lib/http.js';
import { documentCreateSchema } from './_lib/schemas.js';
import { resolveMember } from './_lib/members.js';

// snake_case DB row → camelCase shape the mobile client expects (FamilyDocument).
function toClient(row: any) {
  return {
    id: row.id,
    name: row.title,
    number: row.document_number ?? '',
    expiryDate: row.expiry_date,
    owner: row.family_members?.name ?? 'Family',
    category: row.category ?? 'Other',
    progress: row.progress ?? 0,
  };
}

export default withAuth(['GET', 'POST'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('documents')
      .select('id, title, document_number, expiry_date, category, progress, family_members(name)')
      .order('expiry_date', { ascending: true });
    if (error) throw new HttpError(500, 'Failed to load documents');
    return res.status(200).json({ documents: (data ?? []).map(toClient) });
  }

  // POST — create a document. owner is a member name; resolve to member_id.
  const body = parseBody(documentCreateSchema, req.body);
  const resolved = await resolveMember(ctx.supabase, body.owner);
  const memberId = resolved.status === 'ok' ? resolved.member.id : null;

  const { data, error } = await ctx.supabase
    .from('documents')
    .insert({
      family_id: ctx.familyId,
      member_id: memberId,
      title: body.name,
      document_number: body.number,
      category: body.category,
      expiry_date: body.expiryDate ?? null,
      progress: body.progress,
      source_channel: 'manual',
    })
    .select('id, title, document_number, expiry_date, category, progress, family_members(name)')
    .single();
  if (error) throw new HttpError(500, 'Failed to create document');
  return res.status(201).json({ document: toClient(data) });
});
