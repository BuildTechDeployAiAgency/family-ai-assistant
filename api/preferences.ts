import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { withAuth, parseBody, HttpError } from './_lib/http.js';
import { preferencesUpdateSchema } from './_lib/schemas.js';

const DEFAULTS = { tone: 'concise', assistant_name: null, ai_model: 'concierge', language: 'en' };

function toClient(row: any) {
  return {
    tone: row?.tone ?? DEFAULTS.tone,
    assistantName: row?.assistant_name ?? DEFAULTS.assistant_name,
    aiModel: row?.ai_model ?? DEFAULTS.ai_model,
    language: row?.language ?? DEFAULTS.language,
  };
}

// GET  /api/preferences        → the caller's preferences (defaults if none).
// PATCH /api/preferences       → upsert the caller's preferences.
export default withAuth(['GET', 'PATCH'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const { data } = await ctx.supabase
      .from('preferences')
      .select('tone, assistant_name, ai_model, language')
      .maybeSingle();
    return res.status(200).json({ preferences: toClient(data) });
  }

  const body = parseBody(preferencesUpdateSchema, req.body);
  const { data, error } = await ctx.supabase
    .from('preferences')
    .upsert(
      { user_id: ctx.userId, family_id: ctx.familyId, ...body, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select('tone, assistant_name, ai_model, language')
    .single();
  if (error) throw new HttpError(500, 'Failed to save preferences');
  return res.status(200).json({ preferences: toClient(data) });
});
