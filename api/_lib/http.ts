import type { VercelRequest, VercelResponse } from './vercel.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ZodError, type ZodSchema } from 'zod';
import { userClient } from './supabase.js';
import { logger } from './logger.js';

export interface AuthedContext {
  token: string;
  userId: string;
  familyId: string;
  supabase: SupabaseClient;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Browser origins permitted to call this API (the PWA + local Expo-web dev).
// Native apps send no Origin header, so they're unaffected. Bearer-token auth
// (not cookies) means we never set Allow-Credentials. Extra origins can be
// added at runtime via the CORS_ORIGINS env (comma-separated).
const STATIC_ALLOWED_ORIGINS = [
  'https://family-ai-app.vercel.app',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
];

function allowedOrigins(): Set<string> {
  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...STATIC_ALLOWED_ORIGINS, ...extra]);
}

// Echo CORS headers when the request Origin is allow-listed. Returns true when
// the request is an OPTIONS preflight that has been fully answered (caller
// should stop). RLS + user-JWT still gate all data — CORS only controls which
// browser origins may issue the request.
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers.origin as string) || '';
  if (origin && allowedOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

// Verify the Supabase JWT, resolve the caller's family_id, attach an
// RLS-scoped client. Throws HttpError(401) when unauthenticated.
export async function authenticate(req: VercelRequest): Promise<AuthedContext> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Missing bearer token');

  const supabase = userClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new HttpError(401, 'Invalid or expired session');

  // RLS lets the user read only their own users row → yields their family_id.
  const { data: row, error: rowErr } = await supabase
    .from('users')
    .select('family_id')
    .eq('id', data.user.id)
    .single();
  if (rowErr || !row) throw new HttpError(403, 'No family for this user');

  return { token, userId: data.user.id, familyId: row.family_id, supabase };
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new HttpError(400, 'Validation failed: ' + e.issues.map((i) => i.message).join('; '));
    }
    throw e;
  }
}

type Handler = (req: VercelRequest, res: VercelResponse, ctx: AuthedContext) => Promise<void>;

// Wraps a handler with method-guard, auth, and uniform error handling.
export function withAuth(methods: string[], handler: Handler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // CORS first: answer preflight before the method guard (OPTIONS carries no
    // Authorization header and is not in `methods`).
    if (applyCors(req, res)) return;
    if (!methods.includes(req.method || '')) {
      res.setHeader('Allow', methods.join(', '));
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const ctx = await authenticate(req);
      await handler(req, res, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return res.status(e.status).json({ error: e.message });
      }
      logger.error({ err: (e as Error).message }, 'unhandled api error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
