import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, parseBody, HttpError } from './_lib/http.js';
import { stepCreateSchema, stepUpdateSchema } from './_lib/schemas.js';

// /api/steps — checkable sub-steps of an action (task).
//   GET    ?taskId=...  → ordered steps for one action
//   POST                → add a step (body carries taskId + title)
//   PATCH  ?id=...      → edit a step (toggle completed, rename, reorder, status)
//   DELETE ?id=...      → remove a step
// RLS (auth_family_id) scopes every row to the caller's family. On create,
// family_id is set from the VERIFIED ctx.familyId (never the request body), and
// the parent task is re-checked to belong to the caller — the #1 isolation rule.

function toClient(row: any) {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    detail: row.detail ?? null,
    position: row.position ?? 0,
    completed: !!row.completed,
    status: row.status ?? 'active',
  };
}

const SELECT = 'id, task_id, title, detail, position, completed, status';

export default withAuth(['GET', 'POST', 'PATCH', 'DELETE'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const taskId = (req.query.taskId as string) || '';
    if (!taskId) throw new HttpError(400, 'Missing taskId');
    const { data, error } = await ctx.supabase
      .from('action_steps')
      .select(SELECT)
      .eq('task_id', taskId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new HttpError(500, 'Failed to load steps');
    return res.status(200).json({ steps: (data ?? []).map(toClient) });
  }

  if (req.method === 'POST') {
    const body = parseBody(stepCreateSchema, req.body);
    // Re-verify the parent task is in the caller's family (RLS makes a
    // foreign-family task invisible → not found).
    const { data: task, error: taskErr } = await ctx.supabase
      .from('tasks')
      .select('id')
      .eq('id', body.taskId)
      .single();
    if (taskErr || !task) throw new HttpError(404, 'Action not found');

    const row = {
      family_id: ctx.familyId, // verified source — never the request body
      task_id: body.taskId,
      title: body.title,
      detail: body.detail ?? null,
      position: body.position ?? 0,
    };
    const { data, error } = await ctx.supabase.from('action_steps').insert(row).select(SELECT).single();
    if (error) throw new HttpError(500, 'Failed to add step');
    return res.status(201).json({ step: toClient(data) });
  }

  const id = (req.query.id as string) || '';
  if (!id) throw new HttpError(400, 'Missing step id');

  if (req.method === 'DELETE') {
    const { error } = await ctx.supabase.from('action_steps').delete().eq('id', id);
    if (error) throw new HttpError(500, 'Failed to remove step');
    return res.status(200).json({ ok: true });
  }

  // PATCH
  const body = parseBody(stepUpdateSchema, req.body);
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.detail !== undefined) patch.detail = body.detail;
  if (body.completed !== undefined) patch.completed = body.completed;
  if (body.position !== undefined) patch.position = body.position;
  if (body.status !== undefined) patch.status = body.status;

  const { data, error } = await ctx.supabase
    .from('action_steps')
    .update(patch)
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw new HttpError(500, 'Failed to update step');
  if (!data) throw new HttpError(404, 'Step not found');
  return res.status(200).json({ step: toClient(data) });
});
