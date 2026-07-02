import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Per-request client carrying the caller's JWT → Postgres RLS auto-enforces
// family isolation. This is the ONLY data path used in the MVP.
export function userClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Service-role client BYPASSES RLS. Unused in the MVP; reserved for Phase 3
// server ingestion (Telegram), where every query MUST add an explicit
// `eq('family_id', resolvedId)` with the id derived from a verified source.
export function serviceClient(): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
