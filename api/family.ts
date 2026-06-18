import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, HttpError } from './_lib/http.js';
import { ageFromDob } from './_lib/members.js';
import { env } from './_lib/env.js';

export default withAuth(['GET'], async (_req: VercelRequest, res: VercelResponse, ctx) => {
  const [familyRes, membersRes] = await Promise.all([
    ctx.supabase.from('families').select('id, name, timezone, locale').single(),
    ctx.supabase
      .from('family_members')
      .select('id, name, member_type, role, date_of_birth, grade, avatar, color')
      .order('created_at', { ascending: true }),
  ]);
  if (familyRes.error) throw new HttpError(500, 'Failed to load family');

  const members = (membersRes.data ?? []).map((m: any) => ({
    name: m.name,
    role: m.role ?? m.member_type,
    avatar: m.avatar ?? '🙂',
    color: m.color ?? '#6366f1',
    initials: m.name.slice(0, 1).toUpperCase(),
    memberType: m.member_type,
    grade: m.grade,
    age: ageFromDob(m.date_of_birth, env.REFERENCE_DATE),
  }));

  return res.status(200).json({ family: familyRes.data, members });
});
