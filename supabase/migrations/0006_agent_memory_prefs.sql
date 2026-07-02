-- Family AI — P1 of the self-improving agent.
-- preferences: per-user assistant tuning (how the agent talks to *you*).
-- family_memory: durable, family-scoped facts the agent remembers and injects
--   into its context (the MEMORY.md analog). Capped + salience-ranked at read time.
-- Both isolated by the existing auth_family_id() RLS pattern (see 0001).

-- ── Per-user preferences ──────────────────────────────────────────────────────
create table if not exists public.preferences (
  user_id        uuid primary key references public.users (id) on delete cascade,
  family_id      uuid not null references public.families (id) on delete cascade,
  tone           text not null default 'concise' check (tone in ('concise', 'detailed', 'warm')),
  assistant_name text,
  ai_model       text not null default 'concierge', -- 'concierge' | 'sharper' | 'byok' (illustrative)
  language       text not null default 'en',
  updated_at     timestamptz not null default now()
);
create index if not exists preferences_family_id_idx on public.preferences (family_id);

-- ── Family memory (durable learned/known facts) ──────────────────────────────
create table if not exists public.family_memory (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  kind       text not null default 'fact'
               check (kind in ('fact', 'preference', 'event', 'place', 'relationship', 'other')),
  fact       text not null,
  salience   integer not null default 50 check (salience between 0 and 100),
  source     text not null default 'user' check (source in ('user', 'inferred')),
  status     text not null default 'active' check (status in ('active', 'proposed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Read path orders active facts by salience for the capped injection.
create index if not exists family_memory_inject_idx
  on public.family_memory (family_id, status, salience desc);

-- ── RLS ───────────────────────────────────────────────────────────────────--
alter table public.preferences   enable row level security;
alter table public.family_memory enable row level security;

-- Preferences are personal: a user manages only their own row.
create policy preferences_self on public.preferences
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Memory is shared household knowledge: family-scoped like every domain table.
create policy family_isolation on public.family_memory
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
