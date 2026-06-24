import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, parseBody, HttpError } from './_lib/http.js';
import { memoryCreateSchema, memoryUpdateSchema } from './_lib/schemas.js';

const SELECT = 'id, kind, fact, salience, source, status, created_at, updated_at';

function toClient(m: any) {
  return {
    id: m.id,
    kind: m.kind,
    fact: m.fact,
    salience: m.salience,
    source: m.source,
    status: m.status,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

// The "What I've learned" store — family-scoped durable memory the agent reads.
// GET    /api/memory          → list (active first, then by salience)
// POST   /api/memory          → add a fact (source 'user', status 'active')
// PATCH  /api/memory?id=...    → edit fact / salience / status
// DELETE /api/memory?id=...    → remove a fact
export default withAuth(['GET', 'POST', 'PATCH', 'DELETE'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('family_memory')
      .select(SELECT)
      .order('status', { ascending: true })
      .order('salience', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new HttpError(500, 'Failed to load memory');
    return res.status(200).json({ memory: (data ?? []).map(toClient) });
  }

  if (req.method === 'POST') {
    const body = parseBody(memoryCreateSchema, req.body);
    const { data, error } = await ctx.supabase
      .from('family_memory')
      .insert({ family_id: ctx.familyId, fact: body.fact, kind: body.kind, salience: body.salience, source: 'user', status: 'active' })
      .select(SELECT)
      .single();
    if (error) throw new HttpError(500, 'Failed to add memory');
    return res.status(201).json({ memory: toClient(data) });
  }

  const id = (req.query.id as string) || '';
  if (!id) throw new HttpError(400, 'Missing memory id');

  if (req.method === 'DELETE') {
    const { error } = await ctx.supabase.from('family_memory').delete().eq('id', id);
    if (error) throw new HttpError(500, 'Failed to delete memory');
    return res.status(200).json({ ok: true });
  }

  // PATCH
  const body = parseBody(memoryUpdateSchema, req.body);
  const { data, error } = await ctx.supabase
    .from('family_memory')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw new HttpError(500, 'Failed to update memory');
  if (!data) throw new HttpError(404, 'Memory not found');
  return res.status(200).json({ memory: toClient(data) });
});
