import { env } from './env.js';

const BASE = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: any;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  tools?: any[];
  toolChoice?: 'auto' | 'none';
  responseFormat?: { type: 'json_object' };
  temperature?: number;
}

export interface ChatResult {
  message: any;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost: number };
  model: string;
}

// Single server-side OpenRouter call. The AI key NEVER leaves the server.
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured — set it to enable AI features.');
  }
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://family-ai-assistant.app',
      'X-Title': 'Family AI Assistant',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      ...(opts.tools ? { tools: opts.tools, tool_choice: opts.toolChoice ?? 'auto' } : {}),
      ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
      temperature: opts.temperature ?? 0.2,
      usage: { include: true }, // ask OpenRouter to return generation cost
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }

  const json: any = await res.json();
  const usage = json.usage ?? {};
  return {
    message: json.choices?.[0]?.message ?? { role: 'assistant', content: '' },
    usage: {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      cost: usage.cost ?? 0,
    },
    model: json.model ?? opts.model,
  };
}
