import { cleanEnv, str, num } from 'envalid';

// Fail-fast env validation. Server-only secrets — NO VITE_/EXPO_PUBLIC_ prefixes.
export const env = cleanEnv(process.env, {
  SUPABASE_URL: str(),
  SUPABASE_ANON_KEY: str(), // publishable / anon key (RLS path uses the user's JWT)
  SUPABASE_SERVICE_ROLE_KEY: str({ default: '' }), // unused this MVP; needed for Phase 3 ingestion
  OPENROUTER_API_KEY: str(),
  OPENROUTER_MODEL_AGENT: str({ default: 'openai/gpt-4o-mini' }),   // must support tool-calling
  OPENROUTER_MODEL_EXTRACT: str({ default: 'openai/gpt-4o-mini' }), // cheap, vision + json mode
  // Upstash optional in dev — rate limiting becomes a no-op when absent.
  UPSTASH_REDIS_REST_URL: str({ default: '' }),
  UPSTASH_REDIS_REST_TOKEN: str({ default: '' }),
  // Deterministic "today" for the POC so expiry math matches the seeded dataset.
  REFERENCE_DATE: str({ default: '2026-05-19' }),
  DAILY_COST_CAP_USD: num({ default: 2 }),
});
