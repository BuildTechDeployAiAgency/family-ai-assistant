import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { withAuth, parseBody, HttpError } from '../_lib/http.js';
import { askRequestSchema } from '../_lib/schemas.js';
import { chat, type ChatMessage } from '../_lib/openrouter.js';
import { toolDefs, runTool } from '../_lib/tools.js';
import { buildProfileCard } from '../_lib/profileCard.js';
import { enforceLimit, checkCostCap, recordCost } from '../_lib/ratelimit.js';
import { env } from '../_lib/env.js';
import { logger } from '../_lib/logger.js';

const MAX_ROUNDS = 4;

const SYSTEM = `You are the family's assistant. Answer ONLY from data returned by the tools —
never invent dates, grades, numbers, or names. If a name is ambiguous, ask the user to clarify
instead of guessing. If the tools return nothing relevant, say you don't have that information.
Keep answers short and direct. Today's date and family roster are given below.`;

export default withAuth(['POST'], async (req: VercelRequest, res: VercelResponse, ctx) => {
  await enforceLimit('ask', ctx.familyId);
  await checkCostCap(ctx.familyId, env.DAILY_COST_CAP_USD);

  const { question } = parseBody(askRequestSchema, req.body);
  const card = await buildProfileCard(ctx.supabase);

  const messages: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM}\n\n[Family profile]\n${card}` },
    { role: 'user', content: question },
  ];

  const totals = { prompt: 0, completion: 0, total: 0, cost: 0 };
  const toolsUsed: string[] = [];
  let answer = '';
  let lastModel = env.OPENROUTER_MODEL_AGENT;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const result = await chat({
      model: env.OPENROUTER_MODEL_AGENT,
      messages,
      tools: toolDefs,
      toolChoice: 'auto',
    });
    lastModel = result.model;
    totals.prompt += result.usage.prompt_tokens;
    totals.completion += result.usage.completion_tokens;
    totals.total += result.usage.total_tokens;
    totals.cost += result.usage.cost;

    const msg = result.message;
    const calls = msg.tool_calls ?? [];
    messages.push(msg);

    if (calls.length === 0) {
      answer = typeof msg.content === 'string' ? msg.content : '';
      break;
    }

    // Execute each requested tool and feed results back.
    for (const call of calls) {
      const fnName = call.function?.name;
      let args: any = {};
      try {
        args = JSON.parse(call.function?.arguments || '{}');
      } catch {
        args = {};
      }
      toolsUsed.push(fnName);
      const output = await runTool(ctx.supabase, fnName, args);
      messages.push({ role: 'tool', tool_call_id: call.id, name: fnName, content: JSON.stringify(output) });
    }

    if (round === MAX_ROUNDS - 1 && !answer) {
      // Final forced answer without more tool calls.
      const finalResult = await chat({ model: env.OPENROUTER_MODEL_AGENT, messages });
      totals.prompt += finalResult.usage.prompt_tokens;
      totals.completion += finalResult.usage.completion_tokens;
      totals.total += finalResult.usage.total_tokens;
      totals.cost += finalResult.usage.cost;
      answer = typeof finalResult.message.content === 'string' ? finalResult.message.content : '';
    }
  }

  await recordCost(ctx.familyId, totals.cost);
  await ctx.supabase.from('llm_audit_log').insert({
    family_id: ctx.familyId,
    user_id: ctx.userId,
    endpoint: 'ai/ask',
    model: lastModel,
    prompt_tokens: totals.prompt,
    completion_tokens: totals.completion,
    total_tokens: totals.total,
    cost_usd: totals.cost,
    tools: toolsUsed,
  });
  logger.info({ familyId: ctx.familyId, tools: toolsUsed, model: lastModel }, 'ask complete');

  if (!answer) throw new HttpError(502, 'The assistant could not produce an answer.');
  return res.status(200).json({ answer, toolsUsed });
});
