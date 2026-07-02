import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, parseBody, HttpError } from './_lib/http.js';
import { memberCreateSchema, memberUpdateSchema } from './_lib/schemas.js';
import { ageFromDob } from './_lib/members.js';
import { env } from './_lib/env.js';

const SELECT = 'id, name, member_type, role, date_of_birth, grade, avatar, color';

function toClient(m: any) {
  return {
    id: m.id,
    name: m.name,
    role: m.role ?? m.member_type,
    avatar: m.avatar ?? '🙂',
    color: m.color ?? '#6366f1',
    initials: (m.name ?? '?').slice(0, 1).toUpperCase(),
    memberType: m.member_type,
    grade: m.grade,
    dateOfBirth: m.date_of_birth,
    age: ageFromDob(m.date_of_birth, env.REFERENCE_DATE),
  };
}

// /api/members — manage the caller's family roster.
//   POST            → add a member
//   PATCH ?id=...   → edit a member
//   DELETE ?id=...  → remove a member
// RLS (auth_family_id) scopes every operation to the caller's own family. On
// create, family_id is set from the VERIFIED ctx.familyId (JWT-derived), never
// from the request body — the #1 isolation invariant.
export default withAuth(['POST', 'PATCH', 'DELETE'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'POST') {
    const body = parseBody(memberCreateSchema, req.body);
    const row = {
      family_id: ctx.familyId, // verified source — never the request body
      name: body.name,
      member_type: body.memberType,
      role: body.role ?? null,
      grade: body.grade ?? null,
      avatar: body.avatar ?? '🙂',
      color: body.color ?? '#6366f1',
      date_of_birth: body.dateOfBirth ?? null,
    };
    const { data, error } = await ctx.supabase.from('family_members').insert(row).select(SELECT).single();
    if (error) throw new HttpError(500, 'Failed to add member');
    return res.status(201).json({ member: toClient(data) });
  }

  const id = (req.query.id as string) || '';
  if (!id) throw new HttpError(400, 'Missing member id');

  if (req.method === 'DELETE') {
    const { error } = await ctx.supabase.from('family_members').delete().eq('id', id);
    if (error) throw new HttpError(500, 'Failed to remove member');
    return res.status(200).json({ ok: true });
  }

  // PATCH
  const body = parseBody(memberUpdateSchema, req.body);
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.role !== undefined) patch.role = body.role;
  if (body.grade !== undefined) patch.grade = body.grade;
  if (body.avatar !== undefined) patch.avatar = body.avatar;
  if (body.color !== undefined) patch.color = body.color;
  if (body.dateOfBirth !== undefined) patch.date_of_birth = body.dateOfBirth;

  const { data, error } = await ctx.supabase
    .from('family_members')
    .update(patch)
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw new HttpError(500, 'Failed to update member');
  if (!data) throw new HttpError(404, 'Member not found');

  return res.status(200).json({ member: toClient(data) });
});
