import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, parseBody, HttpError } from './_lib/http.js';
import { taskPatchSchema } from './_lib/schemas.js';

function toClient(row: any) {
  return {
    id: row.id,
    title: row.title,
    owner: row.family_members?.name ?? 'Family',
    dueDate: row.due_date,
    priority: row.priority ?? 'medium',
    completed: !!row.completed,
    sourceCommId: row.source_comm_id ?? null,
  };
}

const SELECT = 'id, title, priority, due_date, completed, source_comm_id, family_members(name)';

export default withAuth(['GET', 'PATCH'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('tasks')
      .select(SELECT)
      .order('due_date', { ascending: true });
    if (error) throw new HttpError(500, 'Failed to load tasks');
    return res.status(200).json({ tasks: (data ?? []).map(toClient) });
  }

  // PATCH /api/tasks?id=... — toggle completion.
  const id = (req.query.id as string) || '';
  if (!id) throw new HttpError(400, 'Missing task id');
  const body = parseBody(taskPatchSchema, req.body);
  const { data, error } = await ctx.supabase
    .from('tasks')
    .update({ completed: body.completed })
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw new HttpError(500, 'Failed to update task');
  return res.status(200).json({ task: toClient(data) });
});
