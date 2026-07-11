// Server-side OpenRouter client. The API key lives ONLY here (env) — never
// ship it to a client. All /api/ai/* routes go through these helpers.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

export function aiConfigured() {
  return !!process.env.OPENROUTER_API_KEY;
}

// Low-level call. Returns the assistant message object ({ content, tool_calls? }).
export async function callOpenRouter({ messages, tools, model, maxTokens = 2048 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENROUTER_API_KEY is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const body = {
    model: model || DEFAULT_MODEL,
    messages,
    max_tokens: maxTokens,
  };
  if (tools && tools.length > 0) body.tools = tools;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error('OpenRouter returned no message');
  }
  return message;
}

// Extract the first JSON object/array from a model reply that may be wrapped
// in code fences or prose.
function extractJson(text) {
  if (!text) throw new Error('Empty model response');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error('No JSON found in model response');
  return JSON.parse(candidate.slice(start).trim());
}

// Call expecting a JSON reply; retries once with a corrective message when
// the first reply doesn't parse.
export async function callOpenRouterJSON({ messages, model, maxTokens }) {
  const first = await callOpenRouter({ messages, model, maxTokens });
  try {
    return extractJson(first.content);
  } catch {
    const retry = await callOpenRouter({
      model,
      maxTokens,
      messages: [
        ...messages,
        { role: 'assistant', content: first.content || '' },
        {
          role: 'user',
          content:
            'That was not valid JSON. Reply again with ONLY the JSON object — no prose, no code fences.',
        },
      ],
    });
    return extractJson(retry.content);
  }
}
