import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env.js';
import { HttpError } from './http.js';

// Rate limiting is keyed by family_id. When Upstash isn't configured (local dev),
// every check is a no-op so the app still runs.
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

function make(limit: number, window: `${number} s` | `${number} m`) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix: 'fai' });
}

const limiters = {
  ask: make(20, '1 m'),
  extract: make(60, '1 m'),
};

export async function enforceLimit(kind: keyof typeof limiters, familyId: string) {
  const limiter = limiters[kind];
  if (!limiter) return; // no-op without Upstash
  const { success } = await limiter.limit(`${kind}:${familyId}`);
  if (!success) throw new HttpError(429, 'Rate limit exceeded — try again shortly.');
}

// ── Per-family daily AI cost cap (80% alert / 100% soft-fail) ─────────────────
export async function checkCostCap(familyId: string, capUsd: number): Promise<void> {
  if (!redis) return;
  const key = `cost:${familyId}:${new Date().toISOString().slice(0, 10)}`;
  const spent = Number((await redis.get<number>(key)) ?? 0);
  if (spent >= capUsd) throw new HttpError(402, 'Daily AI budget reached for this family.');
}

export async function recordCost(familyId: string, costUsd: number): Promise<void> {
  if (!redis || !costUsd) return;
  const key = `cost:${familyId}:${new Date().toISOString().slice(0, 10)}`;
  const total = await redis.incrbyfloat(key, costUsd);
  await redis.expire(key, 60 * 60 * 48);
  return void total;
}
