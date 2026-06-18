import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { withAuth, parseBody, HttpError } from '../_lib/http.js';
import { extractRequestSchema, extractionSchema } from '../_lib/schemas.js';
import { chat } from '../_lib/openrouter.js';
import { enforceLimit, checkCostCap, recordCost } from '../_lib/ratelimit.js';
import { env } from '../_lib/env.js';
import { logger } from '../_lib/logger.js';

const SYSTEM = `You extract structured data from a photo of a household/identity document.
Return ONLY JSON matching:
{ "name": string, "number": string, "category": string, "owner": string, "expiryDate": string|null, "confidence": number }
- category is one of: Identity, Driving, Health, Finance, Education, Admin, Other.
- owner is the family member the document belongs to (a first name), or "Family" if shared.
- expiryDate is YYYY-MM-DD or null if none is visible.
- confidence is 0..1 reflecting how sure you are.
Never invent an expiry date that is not visible in the image.`;

export default withAuth(['POST'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  await enforceLimit('extract', ctx.familyId);
  await checkCostCap(ctx.familyId, env.DAILY_COST_CAP_USD);

  const { imageBase64, mimeType } = parseBody(extractRequestSchema, req.body);
  const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;

  const result = await chat({
    model: env.OPENROUTER_MODEL_EXTRACT,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the document fields as JSON.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  let parsed;
  try {
    parsed = extractionSchema.parse(JSON.parse(result.message.content));
  } catch {
    throw new HttpError(422, 'Could not extract structured data from this image.');
  }

  await recordCost(ctx.familyId, result.usage.cost);
  await ctx.supabase.from('llm_audit_log').insert({
    family_id: ctx.familyId,
    user_id: ctx.userId,
    endpoint: 'ai/extract',
    model: result.model,
    prompt_tokens: result.usage.prompt_tokens,
    completion_tokens: result.usage.completion_tokens,
    total_tokens: result.usage.total_tokens,
    cost_usd: result.usage.cost,
  });
  logger.info({ familyId: ctx.familyId, model: result.model }, 'extract complete');

  return res.status(200).json(parsed);
});
