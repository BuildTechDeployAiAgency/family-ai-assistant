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
